import assert from 'node:assert/strict';
import { test } from 'node:test';
import { specProblems } from './05-contract-check.mjs';

const catalog = { sourceHash: 'example-v1', requirementIds: ['REQ-001'], failureIds: ['F1'] };
const spec = {
  sourceHash: 'example-v1', requirementIds: ['REQ-001'],
  acceptance: [{ id: 'AC-1', requirementIds: ['REQ-001'] }],
  scenarioIds: ['E-1'],
  traces: [{ failureId: 'F1', acceptanceIds: ['AC-1'], scenarioIds: ['E-1'] }],
  questions: [{ id: 'Q-1', answer: '담당자가 정책 확인' }],
};
test('연결된 명세는 구조 검사에 통과한다', () => {
  assert.deepEqual(specProblems(spec, catalog), []);
});
test('요구사항 원문 버전이 바뀌면 명세를 재확인해야 한다', () => {
  assert.deepEqual(specProblems({ ...spec, sourceHash: 'example-v2' }, catalog), ['STALE']);
});
test('완료 조건이 빠진 요구사항과 없는 요구사항을 검출한다', () => {
  assert.ok(specProblems({ ...spec, acceptance: [] }, catalog).includes('MISSING_ACCEPTANCE:REQ-001'));
  assert.ok(specProblems({ ...spec, requirementIds: ['REQ-999'] }, catalog).includes('UNKNOWN_REQUIREMENT:REQ-999'));
});
test('실패 조건의 추적과 방어 조건이 빠지면 검출한다', () => {
  assert.deepEqual(specProblems({ ...spec, traces: [] }, catalog), ['MISSING_TRACE:F1']);
  assert.deepEqual(specProblems({ ...spec, traces: [{ ...spec.traces[0], acceptanceIds: [] }] }, catalog), ['UNGUARDED:F1']);
});
test('존재하지 않는 완료 조건과 시나리오 참조를 검출한다', () => {
  const traces = [{ failureId: 'F1', acceptanceIds: ['AC-9'], scenarioIds: ['E-9'] }];
  assert.deepEqual(specProblems({ ...spec, traces }, catalog), ['UNKNOWN_ACCEPTANCE:AC-9', 'UNKNOWN_SCENARIO:E-9']);
});
test('답하지 않은 정책 질문은 AI가 임의로 확정할 수 없다', () => {
  for (const answer of ['', '미답']) {
    assert.deepEqual(specProblems({ ...spec, questions: [{ id: 'Q-1', answer }] }, catalog), ['UNANSWERED:Q-1']);
  }
});
test('요구사항 자체가 비어 있으면 검출한다', () => {
  assert.deepEqual(specProblems({ ...spec, requirementIds: [] }, catalog), ['NO_REQUIREMENTS']);
});
