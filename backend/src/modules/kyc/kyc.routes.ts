import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/asyncHandler';
import { validate } from '../../common/validate';
import { authGuard } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { uploadToS3 } from '../../common/upload';
import * as svc from './kyc.service';

const r = Router();

// User routes
r.use('/submit', authGuard);
r.use('/documents', authGuard);
r.use('/documents/:docId', authGuard);
r.use('/', authGuard);

r.get('/', asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const kyc = await svc.getKyc(userId);
  res.json(kyc ?? { status: 'NOT_STARTED', documents: [] });
}));

r.post('/submit', validate(z.object({
  fullName: z.string().min(2).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  country: z.string().length(2),
  city: z.string().min(1).max(100),
  address: z.string().min(5).max(300),
  postalCode: z.string().min(2).max(20),
  documentType: z.string().min(2),
  documentNumber: z.string().min(4).max(50),
  phone: z.string().regex(/^\+?[\d\s-]{8,20}$/),
  documents: z.array(z.object({
    docId: z.string().uuid(),
    type: z.enum(['identity', 'address', 'selfie', 'bank_statement', 'utility_bill', 'tax_id', 'other']),
    fileName: z.string(),
    fileUrl: z.string().url(),
    fileSize: z.number().int().positive(),
    mimeType: z.string(),
    uploadedAt: z.string().datetime(),
  })).min(1),
})), asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  res.json(await svc.submitKyc(userId, req.body));
}));

r.post('/documents/upload', validate(z.object({
  type: z.enum(['identity', 'address', 'selfie', 'bank_statement', 'utility_bill', 'tax_id', 'other']),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024),
  mimeType: z.string().refine(v => ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(v), 'Only JPG, PNG, WebP, or PDF allowed'),
})), asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const { type, fileName, fileSize, mimeType } = req.body;
  const docId = crypto.randomUUID();
  const key = `kyc/${userId}/${docId}-${fileName}`;
  const uploadUrl = await uploadToS3(key, mimeType, fileSize);
  const fileUrl = `${process.env.S3_ENDPOINT || ''}/${process.env.S3_BUCKET || 'kyc-uploads'}/${key}`;
  res.json({ docId, uploadUrl, fileUrl, type, fileName, fileSize, mimeType, expiresIn: 300 });
}));

r.delete('/documents/:docId', asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  res.json(await svc.deleteKycDocument(userId, req.params.docId));
}));

r.get('/countries', asyncHandler(async (_req, res) => {
  res.json(svc.SUPPORTED_COUNTRIES);
}));

// Admin routes
const admin = Router();
admin.use(authGuard);

admin.get('/submissions', requirePermission('kyc.view'), asyncHandler(async (req, res) => {
  const data = await svc.listKycSubmissions({
    status: req.query.status as any,
    country: req.query.country as string,
    q: req.query.q as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
  });
  res.json(data);
}));

admin.get('/submissions/:id', requirePermission('kyc.view'), asyncHandler(async (req, res) => {
  res.json(await svc.getKycDetail(req.params.id));
}));

admin.post('/submissions/:id/review', requirePermission('kyc.review'), validate(z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'REQUEST_DOCS']),
  reviewNote: z.string().min(3).max(1000),
  documentDecisions: z.array(z.object({
    docId: z.string(),
    status: z.enum(['APPROVED', 'REJECTED']),
    reason: z.string().optional(),
  })).optional(),
  requestedDocTypes: z.array(z.string()).optional(),
})), asyncHandler(async (req, res) => {
  const actorId = req.user!.sub;
  res.json(await svc.reviewKyc(actorId, req.params.id, req.body));
}));

admin.post('/submissions/:id/request-docs', requirePermission('kyc.request_docs'), validate(z.object({
  docTypes: z.array(z.string().min(1)).min(1),
  note: z.string().min(3).max(500),
})), asyncHandler(async (req, res) => {
  const actorId = req.user!.sub;
  res.json(await svc.requestAdditionalDocs(actorId, req.params.id, req.body.docTypes, req.body.note));
}));

admin.get('/stats', requirePermission('kyc.view'), asyncHandler(async (_req, res) => {
  res.json(await svc.getKycStats());
}));

r.use('/admin', admin);
export default r;
