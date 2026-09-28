import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canViewBidder,
  canRunVerification,
  canUploadDocumentFor,
  canRecordDecision,
} from './access';
import type { Session } from './session';

const officer: Session = { name: 'R. K.', role: 'officer' };
const viewer: Session = { name: 'Obs', role: 'viewer' };
const sentinel: Session = { name: 'Priya', role: 'bidder', companySlug: 'sentinel-imaging' };

test('canViewBidder: officer and viewer see any bidder', () => {
  assert.equal(canViewBidder(officer, 'rapid-procure'), true);
  assert.equal(canViewBidder(viewer, 'rapid-procure'), true);
});

test('canViewBidder: a bidder sees only their own company, on any tender', () => {
  assert.equal(canViewBidder(sentinel, 'sentinel-imaging'), true);
  assert.equal(canViewBidder(sentinel, 'rapid-procure'), false);
});

test('canViewBidder: no session sees nothing', () => {
  assert.equal(canViewBidder(null, 'sentinel-imaging'), false);
});

test('canRunVerification: officer only', () => {
  assert.equal(canRunVerification(officer), true);
  assert.equal(canRunVerification(viewer), false);
  assert.equal(canRunVerification(sentinel), false);
  assert.equal(canRunVerification(null), false);
});

test('canUploadDocumentFor: officer can upload for anyone', () => {
  assert.equal(canUploadDocumentFor(officer, 'rapid-procure'), true);
  assert.equal(canUploadDocumentFor(officer, 'sentinel-imaging'), true);
});

test('canUploadDocumentFor: a bidder can upload for their own company only', () => {
  assert.equal(canUploadDocumentFor(sentinel, 'sentinel-imaging'), true);
  assert.equal(canUploadDocumentFor(sentinel, 'rapid-procure'), false);
  assert.equal(canUploadDocumentFor(sentinel, undefined), false);
});

test('canUploadDocumentFor: viewer and no-session cannot upload', () => {
  assert.equal(canUploadDocumentFor(viewer, 'sentinel-imaging'), false);
  assert.equal(canUploadDocumentFor(null, 'sentinel-imaging'), false);
});

test('canRecordDecision: officer only', () => {
  assert.equal(canRecordDecision(officer), true);
  assert.equal(canRecordDecision(viewer), false);
  assert.equal(canRecordDecision(sentinel), false);
});
