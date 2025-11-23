import { getDemoUser } from '../lib/auth';
import { getSupporterBadges } from '../lib/supporterBadgeLogic';

describe('Supporter Badge Logic', () => {
  it('should return badges for demo user', async () => {
    const user = getDemoUser();
    const { data } = await getSupporterBadges(user.id);
    expect(Array.isArray(data)).toBe(true);
  });
});
