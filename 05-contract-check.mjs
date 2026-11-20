/**
 * AGDD 검사 원리의 공개용 재구성 예제. 근거: 395e55066의 specProblems.
 * 원본은 Markdown을 파싱한다. 여기서는 파싱 결과에 해당하는 가상 객체만 받는다.
 * 문서 구조의 누락을 검사하며, 설계의 타당성이나 실제 테스트 통과를 판정하지 않는다.
 */
export function specProblems(spec, catalog) {
  const problems = [];
  if (spec.sourceHash !== catalog.sourceHash) problems.push('STALE');
  if (spec.requirementIds.length === 0) problems.push('NO_REQUIREMENTS');

  for (const id of spec.requirementIds) {
    if (!catalog.requirementIds.includes(id)) problems.push(`UNKNOWN_REQUIREMENT:${id}`);
    if (!spec.acceptance.some((ac) => ac.requirementIds.includes(id))) {
      problems.push(`MISSING_ACCEPTANCE:${id}`);
    }
  }

  for (const failureId of catalog.failureIds) {
    if (!spec.traces.some((trace) => trace.failureId === failureId)) {
      problems.push(`MISSING_TRACE:${failureId}`);
    }
  }
  for (const trace of spec.traces) {
    if (trace.acceptanceIds.length === 0) problems.push(`UNGUARDED:${trace.failureId}`);
    for (const id of trace.acceptanceIds) {
      if (!spec.acceptance.some((ac) => ac.id === id)) problems.push(`UNKNOWN_ACCEPTANCE:${id}`);
    }
    for (const id of trace.scenarioIds) {
      if (!spec.scenarioIds.includes(id)) problems.push(`UNKNOWN_SCENARIO:${id}`);
    }
  }
  for (const question of spec.questions) {
    if (question.answer === '' || question.answer === '미답') {
      problems.push(`UNANSWERED:${question.id}`);
    }
  }
  return problems;
}
