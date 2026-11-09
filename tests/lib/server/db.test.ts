import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { range, saveFound, saveOwners } from '../../../src/lib/server/db.ts';
import type { Owner, Repo } from '../../../src/lib/server/github.ts';
import { memoryD1 } from '../../d1.ts';

// how a NOCASE column sees a login against the bounds
const within = (login: string, [low, high]: string[]) =>
  login.toLowerCase() >= low.toLowerCase() && login.toLowerCase() < high.toLowerCase();

describe('range', () => {
  it('finds a login whatever case the search was typed in', () => {
    for (const typed of ['jazz', 'JAZZ', 'JazZ', 'bobz', 'BobZ']) {
      expect(within(`${typed}band`, range(typed))).toBe(true);
    }
  });

  it('leaves out logins that only share the start of the prefix', () => {
    expect(within('jazy', range('JAZZ'))).toBe(false);
    expect(within('jb', range('JAZZ'))).toBe(false);
  });
});

describe('saving a refresh', () => {
  let d1: ReturnType<typeof memoryD1>;
  const table = (sql: string) => d1.db.prepare(sql).all();
  const repo = (id: number, stars: number, more: Partial<Repo> = {}): Repo => ({
    id,
    name: `repo-${id}`,
    stars,
    language: 'Go',
    description: null,
    created: 1_300_000_000,
    ...more
  });
  const owner = (id: number, list: Repo[], more: Partial<Owner> = {}): Owner => ({
    id,
    login: `owner-${id}`,
    kind: 0,
    repos: list.length,
    name: null,
    followers: null,
    joined: null,
    list,
    ...more
  });

  beforeEach(() => {
    d1 = memoryD1();
    Object.assign(env, {
      DB: d1,
      ADMINS: '',
      REPO_MIN_STARS: '50',
      REFRESH_TIERS: '1000:1,100:7,0:30'
    });
  });

  it('adds new repos and changes only what changed', async () => {
    await saveOwners([owner(1, [repo(10, 100), repo(11, 60, { created: null })])]);
    await saveOwners([
      owner(1, [
        repo(10, 120, { name: 'Repo-10' }),
        repo(11, 60, { language: null, description: 'Now with words' }),
        repo(12, 70)
      ])
    ]);
    expect(table('SELECT id, name, stars, language, description, created_at FROM repos')).toEqual([
      { id: 10, name: 'Repo-10', stars: 120, language: 'Go', description: null, created_at: 1.3e9 },
      {
        id: 11,
        name: 'repo-11',
        stars: 60,
        language: null,
        description: 'Now with words',
        created_at: 1.3e9
      },
      { id: 12, name: 'repo-12', stars: 70, language: 'Go', description: null, created_at: 1.3e9 }
    ]);
  });

  it('follows a repo to its new owner', async () => {
    await saveOwners([owner(1, [repo(10, 100)])]);
    await saveFound([{ ...repo(10, 100), owner: { id: 2, login: 'owner-2', kind: 1 } }]);
    expect(table('SELECT id, owner_id FROM repos')).toEqual([{ id: 10, owner_id: 2 }]);
  });

  it("leaves out repos of anyone who's asked to be forgotten", async () => {
    await saveOwners([owner(1, [])]);
    d1.db.exec('UPDATE owners SET hidden = 1');
    await saveFound([{ ...repo(10, 100), owner: { id: 1, login: 'owner-1', kind: 0 } }]);
    expect(table('SELECT id FROM repos')).toEqual([]);
  });

  it('renames an owner, down to the case, but never one that is hidden', async () => {
    await saveOwners([owner(1, []), owner(2, [])]);
    d1.db.exec('UPDATE owners SET hidden = 1 WHERE id = 2');
    await saveOwners([owner(1, [], { login: 'Owner-1' }), owner(2, [], { login: 'someone' })]);
    expect(table('SELECT login FROM owners ORDER BY id')).toEqual([
      { login: 'Owner-1' },
      { login: 'owner-2' }
    ]);
  });
});
