"""가상 데이터로 조인 오류와 부분 수정의 한계를 확인한다. 외부 DB를 사용하지 않는다."""
import sqlite3
import unittest
from pathlib import Path


class JoinRegressionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sql = Path(__file__).with_name('revenue-join.sql').read_text()
        with sqlite3.connect(':memory:') as connection:
            rows = connection.execute(sql).fetchall()
        cls.results = {}
        for variant, app, amount in rows:
            cls.results.setdefault(variant, {})[app] = amount

    def test_before_reproduces_both_failures(self):
        self.assertEqual(self.results['before'], {'app-a': 600, 'app-b': 300})

    def test_app_condition_alone_keeps_duplicate_revenue(self):
        self.assertEqual(self.results['app_only'], {'app-a': 200, 'app-b': 200})

    def test_deduplication_alone_keeps_cross_app_revenue(self):
        self.assertEqual(self.results['dedup_only'], {'app-a': 300, 'app-b': 300})

    def test_both_changes_match_each_app_and_the_source_total(self):
        self.assertEqual(self.results['fixed'], {'app-a': 100, 'app-b': 200})
        self.assertEqual(sum(self.results['fixed'].values()), 300)


if __name__ == '__main__':
    unittest.main(verbosity=2)
