/**
 * 공개 설명용 재구성 예제. 회사 서비스 원본 파일 전체가 아니다.
 * 근거: 05c60b847, 6843ba731, fad0a1748의 요약 정산서 로직.
 * 이름·식별자·금액은 예제용이며, DB 조회와 엑셀 스타일은 생략했다.
 * 금액 단위는 정수 원. snapshots는 저장소에서 앱별 최신 버전만 조회한 결과다.
 */
export type Partner = { id: string; name: string; active: boolean };
export type Statement = {
  nonTaxableTotal: number;
  taxableTotal: number;
  vat: number;
  taxableItems: { amount: number }[];
  total: number;
};
export type Snapshot = { partnerId: string; statement: Statement };
export type SummaryRow = {
  partner: string;
  nonTaxable: number;
  supply: number;
  vat: number;
  payable: number;
  note: string | null;
};

export function toSummaryRow(partner: Partner, statement: Statement): SummaryRow {
  const { nonTaxableTotal, taxableTotal, vat, taxableItems, total } = statement;
  if (nonTaxableTotal + taxableTotal !== total) {
    throw new Error(`${partner.name}: 정산 합계 불일치`);
  }

  const supply = taxableTotal - vat;
  if (supply !== taxableItems.reduce((sum, item) => sum + item.amount, 0)) {
    throw new Error(`${partner.name}: 공급가 불일치`);
  }

  // 원본의 특정 계약 예외를 가상 식별자로 치환했다. 검증 후에 지급액만 조정한다.
  const separatelySettled = partner.id === 'partner-separate';
  return {
    partner: partner.name,
    nonTaxable: nonTaxableTotal,
    supply,
    vat,
    payable: separatelySettled ? taxableTotal : total,
    note: separatelySettled ? '면세 금액은 별도 인보이스로 처리' : null,
  };
}

export function buildSummaryRows(partners: Partner[], snapshots: Snapshot[]) {
  const latest = new Map(snapshots.map((snapshot) => [snapshot.partnerId, snapshot]));
  return partners.filter((partner) => partner.active).flatMap((partner) => {
    const snapshot = latest.get(partner.id);
    // 자료 없는 앱은 제외하되, 자료가 있고 정산금이 0원인 앱은 남긴다.
    return snapshot ? [toSummaryRow(partner, snapshot.statement)] : [];
  });
}

export function totalPayable(rows: SummaryRow[]) {
  // 계약별 지급액 조정을 보존하기 위해 원래 발행액을 다시 더하지 않는다.
  return rows.reduce((sum, row) => sum + row.payable, 0);
}
