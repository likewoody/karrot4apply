import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSummaryRows, toSummaryRow, totalPayable } from './settlement-summary.ts';
import type { Statement } from './settlement-summary.ts';

const partner = { id: 'partner-a', name: '예제 A', active: true };
const statement: Statement = {
  nonTaxableTotal: 20, taxableTotal: 110, vat: 10,
  taxableItems: [{ amount: 60 }, { amount: 40 }], total: 130,
};

test('발행액을 재사용하고 공급가·부가세·지급액을 구분한다', () => {
  assert.deepEqual(toSummaryRow(partner, statement), {
    partner: '예제 A', nonTaxable: 20, supply: 100, vat: 10, payable: 130, note: null,
  });
});
test('합계가 틀린 스냅샷은 결과로 내보내지 않는다', () => {
  assert.throws(() => toSummaryRow(partner, { ...statement, total: 129 }), /정산 합계 불일치/);
});
test('합계는 맞아도 세부 항목과 공급가가 다르면 거부한다', () => {
  assert.throws(() => toSummaryRow(partner, {
    ...statement, taxableItems: [{ amount: 99 }],
  }), /공급가 불일치/);
});
test('계약 종료 앱과 스냅샷 없는 앱은 제외한다', () => {
  const partners = [partner, { ...partner, id: 'ended', active: false },
    { ...partner, id: 'missing' }];
  const snapshots = [{ partnerId: partner.id, statement }, { partnerId: 'ended', statement }];
  assert.equal(buildSummaryRows(partners, snapshots).length, 1);
});
test('정산금 0원도 확인 대상이므로 남긴다', () => {
  const zero: Statement = { nonTaxableTotal: 0, taxableTotal: 0, vat: 0,
    taxableItems: [], total: 0 };
  assert.equal(buildSummaryRows([partner], [{ partnerId: partner.id, statement: zero }])[0].payable, 0);
});
test('대상이 없으면 빈 목록으로 반환한다', () => {
  assert.deepEqual(buildSummaryRows([], []), []);
});
test('별도 인보이스 계약은 발행액을 보존하고 지급액만 구분한다', () => {
  const separate = toSummaryRow({ ...partner, id: 'partner-separate' }, statement);
  assert.equal(separate.nonTaxable, 20);
  assert.equal(separate.payable, 110);
  assert.equal(totalPayable([toSummaryRow(partner, statement), separate]), 240);
});
test('계약 예외를 적용하기 전 원래 스냅샷의 오류부터 검출한다', () => {
  assert.throws(() => toSummaryRow({ ...partner, id: 'partner-separate' },
    { ...statement, total: 1 }), /정산 합계 불일치/);
  assert.throws(() => toSummaryRow({ ...partner, id: 'partner-separate' },
    { ...statement, taxableItems: [] }), /공급가 불일치/);
});
