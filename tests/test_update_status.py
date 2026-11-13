# Copyright (C) 2026 Open Source Robotics Foundation
# SPDX-License-Identifier: Apache-2.0
"""Prevent current reports from becoming an append-only audit log."""
import copy
from datetime import datetime, timezone
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('status_updater', Path(__file__).resolve().parents[1] / 'scripts/update-status.py')
updater = importlib.util.module_from_spec(spec)
spec.loader.exec_module(updater)


class CurrentReportTests(unittest.TestCase):
    def report(self, repository='gz-sim-rs'):
        return dict(schema_version=1, repository=repository,
                    updated_at=datetime.now(timezone.utc).isoformat(), state='idle',
                    summary='Development paused.', model='Coordinator', active=[],
                    accepted_slices=[], remaining=[], blockers=[], plan_status={},
                    quality=dict(note='Local checks passed; release pending.'))

    def test_concise_current_report_is_valid(self):
        report = self.report()
        self.assertEqual(updater.validate(report, 'gz-sim-rs'), report)

    def test_appended_history_is_rejected_without_modifying_input(self):
        report = self.report()
        report['quality']['note'] = 'Old checkpoint. ' * 100
        before = copy.deepcopy(report)
        with self.assertRaisesRegex(ValueError, 'link detailed evidence'):
            updater.validate(report, 'gz-sim-rs')
        self.assertEqual(report, before)

    def test_current_cards_cannot_expand_into_phase_history(self):
        report = self.report()
        report['active'] = [dict(id='SENSOR-01', title='Old phase', detail='Historical work.')] * 4
        with self.assertRaisesRegex(ValueError, 'three concise'):
            updater.validate(report, 'gz-sim-rs')

    def test_other_owners_historical_reports_remain_valid(self):
        report = self.report('sdformat-rs')
        report['quality']['note'] = 'Existing owner evidence. ' * 100
        self.assertEqual(updater.validate(report, 'sdformat-rs'), report)


if __name__ == '__main__':
    unittest.main()
