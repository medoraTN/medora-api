import { isStatusChange } from '../../../src/domain/entities/patient.entity';

describe('patient status change', () => {
  it('allows distinct documented statuses', () => {
    expect(isStatusChange('WAITING', 'IN_PROGRESS')).toBe(true);
  });

  it('rejects repeating the current status', () => {
    expect(isStatusChange('WAITING', 'WAITING')).toBe(false);
  });
});
