import { ObjectId } from 'mongodb';
import { col, COL } from '../../db/collections';
import { KycDoc, KycStatus } from '../../db/models';
import { notFound, badRequest } from '../../common/errors';
import { logAction } from '../admin/admin.service';

export interface KycDocument {
  docId: string;
  type: 'identity' | 'address' | 'selfie' | 'bank_statement' | 'utility_bill' | 'tax_id' | 'other';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  ocrData?: Record<string, any>;
}

export interface KycSubmissionInput {
  fullName: string;
  dateOfBirth: string;
  country: string;
  city: string;
  address: string;
  postalCode: string;
  documentType: string;
  documentNumber: string;
  phone: string;
  documents: KycDocument[];
}

export interface KycReviewInput {
  status: 'APPROVED' | 'REJECTED' | 'REQUEST_DOCS';
  reviewNote: string;
  documentDecisions?: { docId: string; status: 'APPROVED' | 'REJECTED'; reason?: string }[];
  requestedDocTypes?: string[];
}

export async function getKyc(userId: string) {
  const kyc = await col<KycDoc>(COL.kyc).findOne({ userId: new ObjectId(userId) });
  if (!kyc) return { status: 'NOT_STARTED' as const, documents: [] };
  return kyc;
}

export async function submitKyc(userId: string, input: KycSubmissionInput) {
  const now = new Date();
  const userOid = new ObjectId(userId);

  if (!input.documents || input.documents.length < 1) {
    throw badRequest('At least one identity document is required');
  }
  const hasIdentity = input.documents.some(d => d.type === 'identity');
  if (!hasIdentity) {
    throw badRequest('Identity document (passport, ID card, or driving license) is required');
  }

  const fields = {
    fullName: input.fullName.trim(),
    dateOfBirth: input.dateOfBirth,
    country: input.country,
    city: input.city,
    address: input.address,
    postalCode: input.postalCode,
    documentType: input.documentType,
    documentNumber: input.documentNumber.trim().toUpperCase(),
    phone: input.phone,
    documents: input.documents.map(d => ({ ...d, uploadedAt: new Date(d.uploadedAt), status: 'PENDING' as const })),
    status: 'PENDING' as KycStatus,
    verificationLevel: 'BASIC' as const,
    reviewedBy: null,
    reviewNote: undefined as string | undefined,
    requestedDocTypes: undefined as string[] | undefined,
    updatedAt: now,
  };

  const existing = await col<KycDoc>(COL.kyc).findOne({ userId: userOid });
  if (existing) {
    if (existing.status === 'REJECTED') {
      await col<KycDoc>(COL.kyc).updateOne(
        { _id: existing._id },
        {
          $set: fields,
          $push: {
            submissionHistory: {
              submittedAt: existing.updatedAt,
              status: existing.status,
              reviewNote: existing.reviewNote,
              documents: existing.documents,
            } as any,
          },
        }
      );
    } else {
      await col<KycDoc>(COL.kyc).updateOne({ _id: existing._id }, { $set: fields });
    }
    return { ...existing, ...fields, _id: existing._id };
  }

  const record: KycDoc = { userId: userOid, ...fields, submissionHistory: [], createdAt: now };
  const result = await col<KycDoc>(COL.kyc).insertOne(record);
  return { ...record, _id: result.insertedId };
}

export async function addKycDocument(userId: string, document: KycDocument) {
  const userOid = new ObjectId(userId);
  const now = new Date();
  const existing = await col<KycDoc>(COL.kyc).findOne({ userId: userOid });
  if (!existing) {
    throw badRequest('Submit KYC profile first before uploading documents');
  }
  const docWithMeta = { ...document, uploadedAt: now, status: 'PENDING' as const };
  await col<KycDoc>(COL.kyc).updateOne(
    { _id: existing._id },
    { $push: { documents: docWithMeta as any }, $set: { updatedAt: now, status: 'PENDING' } }
  );
  return docWithMeta;
}

export async function deleteKycDocument(userId: string, docId: string) {
  const userOid = new ObjectId(userId);
  const now = new Date();
  const existing = await col<KycDoc>(COL.kyc).findOne({ userId: userOid });
  if (!existing) throw notFound('KYC record not found');
  await col<KycDoc>(COL.kyc).updateOne(
    { _id: existing._id },
    { $pull: { documents: { docId } as any }, $set: { updatedAt: now } }
  );
  return { success: true };
}

export async function listKycSubmissions(opts: {
  status?: KycStatus | '';
  country?: string;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;
  const filter: any = {};
  if (opts.status) filter.status = opts.status;
  if (opts.country) filter.country = opts.country;
  if (opts.q?.trim()) {
    const q = opts.q.trim();
    filter.$or = [
      { fullName: { $regex: q, $options: 'i' } },
      { documentNumber: { $regex: q, $options: 'i' } },
    ];
  }

  const pipeline = [
    { $match: filter },
    {
      $lookup: {
        from: COL.users,
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1, userId: 1, fullName: 1, country: 1, city: 1, status: 1,
        documentType: 1, documentNumber: 1, documents: 1, createdAt: 1, updatedAt: 1,
        reviewedBy: 1, reviewNote: 1, requestedDocTypes: 1,
        'user.email': 1, 'user.roleName': 1, 'user.status': 1,
      },
    },
    { $sort: { updatedAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  ];

  const [items, total] = await Promise.all([
    col<KycDoc>(COL.kyc).aggregate(pipeline).toArray(),
    col<KycDoc>(COL.kyc).countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function getKycDetail(kycId: string) {
  const pipeline = [
    { $match: { _id: new ObjectId(kycId) } },
    {
      $lookup: {
        from: COL.users,
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: COL.employeeProfiles,
        localField: 'reviewedBy',
        foreignField: 'userId',
        as: 'reviewer',
      },
    },
    { $unwind: { path: '$reviewer', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        passwordHash: 0,
        'user.passwordHash': 0,
        'user.twoFactorSecret': 0,
      },
    },
  ];
  const results = await col<KycDoc>(COL.kyc).aggregate(pipeline).toArray();
  if (!results.length) throw notFound('KYC submission not found');
  return results[0];
}

export async function reviewKyc(actorId: string, kycId: string, input: KycReviewInput) {
  const now = new Date();
  const actorOid = new ObjectId(actorId);
  const kycOid = new ObjectId(kycId);
  const kyc = await col<KycDoc>(COL.kyc).findOne({ _id: kycOid });
  if (!kyc) throw notFound('KYC submission not found');
  if (kyc.status === 'APPROVED') {
    throw badRequest('KYC is already approved');
  }

  const update: any = {
    $set: {
      status: input.status,
      reviewNote: input.reviewNote,
      reviewedBy: actorOid,
      updatedAt: now,
    },
  };

  if (input.documentDecisions?.length) {
    for (const decision of input.documentDecisions) {
      await col<KycDoc>(COL.kyc).updateOne(
        { _id: kycOid, 'documents.docId': decision.docId },
        {
          $set: {
            'documents.$.status': decision.status,
            'documents.$.rejectionReason': decision.reason,
          },
        }
      );
    }
  }

  if (input.status === 'REQUEST_DOCS' && input.requestedDocTypes?.length) {
    update.$set.requestedDocTypes = input.requestedDocTypes;
  }

  await col<KycDoc>(COL.kyc).updateOne({ _id: kycOid }, update);

  if (input.status === 'APPROVED') {
    await col(COL.users).updateOne(
      { _id: kyc.userId },
      { $set: { verificationLevel: 'ADVANCED', updatedAt: now } }
    );
  }

  await logAction(actorId, `kyc.${input.status.toLowerCase()}`, 'kyc', kycId, {
    reviewNote: input.reviewNote,
    previousStatus: kyc.status,
    userId: kyc.userId.toString(),
  });

  return { success: true, status: input.status };
}

export async function requestAdditionalDocs(actorId: string, kycId: string, docTypes: string[], note: string) {
  const now = new Date();
  const kycOid = new ObjectId(kycId);
  const kyc = await col<KycDoc>(COL.kyc).findOne({ _id: kycOid });
  if (!kyc) throw notFound('KYC submission not found');

  await col<KycDoc>(COL.kyc).updateOne(
    { _id: kycOid },
    {
      $set: {
        status: 'PENDING' as KycStatus,
        requestedDocTypes: docTypes,
        reviewNote: note,
        updatedAt: now,
      },
    }
  );

  await logAction(actorId, 'kyc.request_docs', 'kyc', kycId, {
    docTypes,
    note,
    userId: kyc.userId.toString(),
  });

  return { success: true };
}

export async function getKycStats() {
  const pipeline = [
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ];
  const stats = await col<KycDoc>(COL.kyc).aggregate(pipeline).toArray();
  const byStatus = Object.fromEntries(stats.map(s => [s._id, s.count]));
  const total = await col<KycDoc>(COL.kyc).countDocuments();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const submittedToday = await col<KycDoc>(COL.kyc).countDocuments({ createdAt: { $gte: today } });

  const reviewTimePipeline = [
    { $match: { status: 'APPROVED', reviewedBy: { $ne: null } } },
    { $project: { reviewTime: { $subtract: ['$updatedAt', '$createdAt'] } } },
    { $group: { _id: null, avgReviewTime: { $avg: '$reviewTime' } } },
  ];
  const reviewTimeResult = await col<KycDoc>(COL.kyc).aggregate(reviewTimePipeline).toArray();
  const avgReviewTimeMs = reviewTimeResult[0]?.avgReviewTime ?? 0;

  return {
    total,
    submittedToday,
    byStatus: {
      PENDING: byStatus.PENDING ?? 0,
      APPROVED: byStatus.APPROVED ?? 0,
      REJECTED: byStatus.REJECTED ?? 0,
    },
    avgReviewTimeHours: Math.round(avgReviewTimeMs / (1000 * 60 * 60) * 10) / 10,
    approvalRate: total > 0 ? Math.round(((byStatus.APPROVED ?? 0) / total) * 100) : 0,
  };
}

export const SUPPORTED_COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸', idTypes: ['passport', 'driving_license', 'state_id'] },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', idTypes: ['passport', 'driving_license', 'national_id'] },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', idTypes: ['passport', 'driving_license', 'provincial_id'] },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', idTypes: ['passport', 'driving_license'] },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', idTypes: ['passport', 'national_id', 'driving_license'] },
  { code: 'FR', name: 'France', flag: '🇫🇷', idTypes: ['passport', 'national_id'] },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', idTypes: ['passport', 'national_id'] },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', idTypes: ['passport', 'national_id', 'driving_license'] },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', idTypes: ['passport', 'national_id'] },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', idTypes: ['passport', 'resident_card', 'driving_license'] },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', idTypes: ['passport', 'national_id', 'driving_license'] },
  { code: 'IN', name: 'India', flag: '🇮🇳', idTypes: ['passport', 'aadhaar', 'driving_license', 'voter_id'] },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', idTypes: ['passport', 'national_id', 'driving_license'] },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', idTypes: ['passport', 'national_id', 'driving_license'] },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', idTypes: ['passport', 'national_id', 'driving_license'] },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', idTypes: ['passport', 'emirates_id', 'driving_license'] },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', idTypes: ['passport', 'national_id', 'driving_license'] },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', idTypes: ['passport', 'national_id'] },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', idTypes: ['passport', 'national_id'] },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', idTypes: ['passport', 'national_id'] },
];
