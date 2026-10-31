#!/usr/bin/env python3
# Copyright (C) 2026 Open Source Robotics Foundation
# SPDX-License-Identifier: Apache-2.0
"""Validate and publish one owner's report without changing shared Git state."""
import argparse
import base64
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / 'data/catalog.json').read_text())
REPOSITORIES = set(CATALOG['repositories'] + CATALOG.get('retired_repositories', []))
PACKET_STATES = {'not_started', 'in_progress', 'blocked', 'in_review', 'complete'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def stamp(value):
    result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    require(result.tzinfo is not None, 'timestamp needs a time zone')
    return result


def public_url(value):
    return isinstance(value, str) and value.startswith('https://github.com/gazebosim-rs/')


def validate(data, repository):
    require(repository in REPOSITORIES and data['repository'] == repository, 'repository mismatch')
    require(data['schema_version'] == 1, 'unsupported schema version')
    require(data['state'] in {'active', 'blocked', 'idle', 'complete', 'unknown'}, 'invalid repository state')
    require(stamp(data['updated_at']) <= datetime.now(timezone.utc), 'timestamp is in the future')
    for key in ('summary', 'model'):
        require(isinstance(data[key], str) and bool(data[key]), f'{key} must be nonempty text')
    for key in ('active', 'accepted_slices', 'remaining', 'blockers'):
        require(isinstance(data[key], list), f'{key} must be a list')
    for item in data['active']:
        require(all(isinstance(item[key], str) for key in ('id', 'title', 'detail')), 'invalid active item')
    for item in data['accepted_slices']:
        require(isinstance(item['title'], str) and public_url(item['url']), 'invalid accepted slice')
    for item in data['remaining'] + data['blockers']:
        require(isinstance(item, str), 'remaining work and blockers must be text')
    packets = {item['id'] for item in CATALOG['packets'] + CATALOG.get('retired_packets', [])}
    require(isinstance(data['plan_status'], dict), 'plan_status must be an object')
    require(all(key in packets and state in PACKET_STATES for key, state in data['plan_status'].items()), 'invalid packet ID or state')
    for key, names in [('phase_status', {p['id'] for p in CATALOG['phases']}), ('system_status', {s['name'] for s in CATALOG['systems']})]:
        if key in data:
            require(repository == 'gz-sim-rs', f'{key} belongs to the coordinator')
            require(isinstance(data[key], dict) and all(k in names and v in PACKET_STATES for k, v in data[key].items()), f'invalid {key}')
    quality = data['quality']
    require(isinstance(quality['note'], str), 'quality.note must be text')
    require(quality.get('revision') is None or isinstance(quality['revision'], str), 'invalid quality revision')
    tests = quality.get('rust_tests')
    require(tests is None or (type(tests) is int and tests >= 0), 'invalid test count')
    for metric in ('lines', 'regions'):
        counts = quality.get('coverage', {}).get(metric)
        if counts is not None:
            require(isinstance(counts, list) and len(counts) == 2 and all(type(n) is int for n in counts), 'coverage requires [covered,total]')
            require(0 <= counts[0] <= counts[1] and counts[1] > 0, 'invalid coverage denominator')
    for value in quality.get('upstream', {}).values():
        require(value is None or (type(value) is int and value >= 0), 'invalid upstream count')
    ci = quality.get('ci', {})
    require(ci.get('state', 'unknown') in {'success', 'failure', 'pending', 'unknown'}, 'invalid CI state')
    require(ci.get('url') is None or public_url(ci['url']), 'CI link must be public project evidence')
    require(quality.get('revision_url') is None or public_url(quality['revision_url']), 'revision link must be public project evidence')
    return data


def api(path, body=None):
    command = ['gh', 'api', path]
    if body is not None:
        command += ['--method', 'PUT', '--input', '-']
    result = subprocess.run(command, input=json.dumps(body) if body else None, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def publish(data, repository):
    endpoint = f'repos/gazebosim-rs/rewrite-progress/contents/data/{repository}.json'
    payload = base64.b64encode((json.dumps(data, indent=2) + '\n').encode()).decode()
    for attempt in range(3):
        previous = api(endpoint + '?ref=status')
        previous_data = json.loads(base64.b64decode(previous['content']))
        if previous_data == data:
            print('Report already current:', repository)
            return
        require(stamp(previous_data['updated_at']) <= stamp(data['updated_at']), 'refusing to overwrite a newer report')
        try:
            result = api(endpoint, {'message': f'Update {repository} progress', 'branch': 'status', 'sha': previous['sha'], 'content': payload})
            print(result['commit']['html_url'])
            return
        except subprocess.CalledProcessError as error:
            if attempt == 2 or '409' not in error.stderr:
                raise
            time.sleep(0.3)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('repository', choices=sorted(REPOSITORIES))
    parser.add_argument('file', type=Path)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    try:
        data = validate(json.loads(args.file.read_text()), args.repository)
        if args.dry_run:
            print('Valid status:', args.repository)
        else:
            publish(data, args.repository)
    except (ValueError, KeyError, TypeError, OSError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'Status update failed: {error}\n')


if __name__ == '__main__':
    main()
