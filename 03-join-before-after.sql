-- 공개 설명용 재구성 예제. 근거 커밋: 43ba75fe1.
-- MySQL 8의 조인 수정 원리를 SQLite에서도 실행할 수 있는 읽기 전용 CTE로 표현했다.
-- 실제 데이터·테이블·식별자가 아니며, 저장·삭제·운영 DB 호출은 하지 않는다.
-- app-a는 같은 지면 설정이 2행, app-b는 1행이다. 실제 매출은 각각 100원·200원이다.
WITH settings AS (
    SELECT 'app-a' AS app_id, 'shared-slot' AS placement_key, 'android' AS platform
    UNION ALL SELECT 'app-a', 'shared-slot', 'ios'
    UNION ALL SELECT 'app-b', 'shared-slot', 'android'
), revenues AS (
    SELECT 'app-a' AS app_id, 'shared-slot' AS placement_key, 100 AS amount
    UNION ALL SELECT 'app-b', 'shared-slot', 200
), unique_settings AS (
    SELECT DISTINCT app_id, placement_key FROM settings
), results AS (
    -- 두 결함이 함께 있는 경우: A=600, B=300.
    SELECT 'before' AS variant, s.app_id, SUM(r.amount) AS revenue
    FROM settings s JOIN revenues r ON s.placement_key = r.placement_key
    GROUP BY s.app_id
    UNION ALL
    -- 앱 구분만 고치면 A의 설정 중복은 남는다: A=200, B=200.
    SELECT 'app_only', s.app_id, SUM(r.amount)
    FROM settings s JOIN revenues r
      ON s.app_id = r.app_id AND s.placement_key = r.placement_key
    GROUP BY s.app_id
    UNION ALL
    -- 중복만 없애면 다른 앱 매출이 계속 섞인다: A=300, B=300.
    SELECT 'dedup_only', s.app_id, SUM(r.amount)
    FROM unique_settings s JOIN revenues r ON s.placement_key = r.placement_key
    GROUP BY s.app_id
    UNION ALL
    -- 두 조건을 함께 고쳐야 원천 금액과 일치한다: A=100, B=200.
    SELECT 'fixed', s.app_id, SUM(r.amount)
    FROM unique_settings s JOIN revenues r
      ON s.app_id = r.app_id AND s.placement_key = r.placement_key
    GROUP BY s.app_id
)
SELECT variant, app_id, revenue FROM results ORDER BY variant, app_id;
