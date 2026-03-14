/**
 * Task State Machine Tests
 */

import { describe, it, expect } from 'bun:test';
import { 
  TASK_STATE_TRANSITIONS, 
  isValidTransition, 
  canRiderPerformTask, 
  getRequiredRiderRoles,
  getNextStates,
  isTerminalState,
  getStatusCategory,
  CancellationReasonCode,
  SYSTEM_TIMERS 
} from '../../lib/services/task-state-machine.service';

describe('Task State Transitions', () => {
  it('should define valid transitions for CREATED', () => {
    expect(TASK_STATE_TRANSITIONS['CREATED']).toContain('MATCHING');
    expect(TASK_STATE_TRANSITIONS['CREATED']).toContain('CANCELLED');
  });

  it('should define valid transitions for MATCHING', () => {
    expect(TASK_STATE_TRANSITIONS['MATCHING']).toContain('ASSIGNED');
    expect(TASK_STATE_TRANSITIONS['MATCHING']).toContain('CANCELLED');
    expect(TASK_STATE_TRANSITIONS['MATCHING']).toContain('FAILED');
  });

  it('should define valid transitions for ASSIGNED', () => {
    expect(TASK_STATE_TRANSITIONS['ASSIGNED']).toContain('ACCEPTED');
    expect(TASK_STATE_TRANSITIONS['ASSIGNED']).toContain('MATCHING');
    expect(TASK_STATE_TRANSITIONS['ASSIGNED']).toContain('CANCELLED');
  });

  it('should define valid transitions for ACCEPTED', () => {
    expect(TASK_STATE_TRANSITIONS['ACCEPTED']).toContain('ARRIVED');
    expect(TASK_STATE_TRANSITIONS['ACCEPTED']).toContain('CANCELLED');
  });

  it('should define valid transitions for ARRIVED', () => {
    expect(TASK_STATE_TRANSITIONS['ARRIVED']).toContain('PICKED_UP');
    expect(TASK_STATE_TRANSITIONS['ARRIVED']).toContain('CANCELLED');
  });

  it('should define valid transitions for PICKED_UP', () => {
    expect(TASK_STATE_TRANSITIONS['PICKED_UP']).toContain('IN_TRANSIT');
    expect(TASK_STATE_TRANSITIONS['PICKED_UP']).toContain('CANCELLED');
  });

  it('should define valid transitions for IN_TRANSIT', () => {
    expect(TASK_STATE_TRANSITIONS['IN_TRANSIT']).toContain('DELIVERED');
    expect(TASK_STATE_TRANSITIONS['IN_TRANSIT']).toContain('CANCELLED');
    expect(TASK_STATE_TRANSITIONS['IN_TRANSIT']).toContain('FAILED');
  });

  it('should define valid transitions for DELIVERED', () => {
    expect(TASK_STATE_TRANSITIONS['DELIVERED']).toContain('COMPLETED');
  });

  it('should have empty transitions for terminal states', () => {
    expect(TASK_STATE_TRANSITIONS['COMPLETED']).toEqual([]);
    expect(TASK_STATE_TRANSITIONS['CANCELLED']).toEqual([]);
    expect(TASK_STATE_TRANSITIONS['FAILED']).toEqual([]);
  });
});

describe('isValidTransition', () => {
  it('should return true for valid transitions', () => {
    expect(isValidTransition('CREATED', 'MATCHING')).toBe(true);
    expect(isValidTransition('MATCHING', 'ASSIGNED')).toBe(true);
    expect(isValidTransition('ASSIGNED', 'ACCEPTED')).toBe(true);
    expect(isValidTransition('IN_TRANSIT', 'DELIVERED')).toBe(true);
  });

  it('should return false for invalid transitions', () => {
    expect(isValidTransition('CREATED', 'COMPLETED')).toBe(false);
    expect(isValidTransition('CREATED', 'ACCEPTED')).toBe(false);
    expect(isValidTransition('CANCELLED', 'CREATED')).toBe(false);
    expect(isValidTransition('COMPLETED', 'CANCELLED')).toBe(false);
  });

  it('should return false for terminal state transitions', () => {
    expect(isValidTransition('COMPLETED', 'CANCELLED')).toBe(false);
    expect(isValidTransition('CANCELLED', 'MATCHING')).toBe(false);
    expect(isValidTransition('FAILED', 'CREATED')).toBe(false);
  });
});

describe('Rider Capabilities', () => {
  describe('canRiderPerformTask', () => {
    it('should allow SMART_BODA_RIDER for boda rides', () => {
      expect(canRiderPerformTask('SMART_BODA_RIDER', 'SMART_BODA_RIDE')).toBe(true);
    });

    it('should allow SMART_BODA_RIDER for item delivery', () => {
      expect(canRiderPerformTask('SMART_BODA_RIDER', 'ITEM_DELIVERY')).toBe(true);
    });

    it('should not allow SMART_BODA_RIDER for food delivery', () => {
      expect(canRiderPerformTask('SMART_BODA_RIDER', 'FOOD_DELIVERY')).toBe(false);
    });

    it('should allow SMART_CAR_DRIVER for car rides', () => {
      expect(canRiderPerformTask('SMART_CAR_DRIVER', 'SMART_CAR_RIDE')).toBe(true);
    });

    it('should not allow SMART_CAR_DRIVER for food delivery', () => {
      expect(canRiderPerformTask('SMART_CAR_DRIVER', 'FOOD_DELIVERY')).toBe(false);
    });

    it('should allow DELIVERY_PERSONNEL for food delivery', () => {
      expect(canRiderPerformTask('DELIVERY_PERSONNEL', 'FOOD_DELIVERY')).toBe(true);
    });

    it('should allow DELIVERY_PERSONNEL for shopping delivery', () => {
      expect(canRiderPerformTask('DELIVERY_PERSONNEL', 'SHOPPING')).toBe(true);
    });

    it('should allow DELIVERY_PERSONNEL for health delivery', () => {
      expect(canRiderPerformTask('DELIVERY_PERSONNEL', 'SMART_HEALTH_DELIVERY')).toBe(true);
    });

    it('should not allow DELIVERY_PERSONNEL for rides', () => {
      expect(canRiderPerformTask('DELIVERY_PERSONNEL', 'SMART_BODA_RIDE')).toBe(false);
      expect(canRiderPerformTask('DELIVERY_PERSONNEL', 'SMART_CAR_RIDE')).toBe(false);
    });
  });

  describe('getRequiredRiderRoles', () => {
    it('should return SMART_BODA_RIDER for boda rides', () => {
      const roles = getRequiredRiderRoles('SMART_BODA_RIDE');
      expect(roles).toContain('SMART_BODA_RIDER');
      expect(roles.length).toBe(1);
    });

    it('should return SMART_CAR_DRIVER for car rides', () => {
      const roles = getRequiredRiderRoles('SMART_CAR_RIDE');
      expect(roles).toContain('SMART_CAR_DRIVER');
      expect(roles.length).toBe(1);
    });

    it('should return DELIVERY_PERSONNEL for food delivery', () => {
      const roles = getRequiredRiderRoles('FOOD_DELIVERY');
      expect(roles).toContain('DELIVERY_PERSONNEL');
      expect(roles.length).toBe(1);
    });

    it('should return multiple roles for item delivery', () => {
      const roles = getRequiredRiderRoles('ITEM_DELIVERY');
      expect(roles).toContain('SMART_BODA_RIDER');
      expect(roles).toContain('SMART_CAR_DRIVER');
      expect(roles).toContain('DELIVERY_PERSONNEL');
      expect(roles.length).toBe(3);
    });
  });
});

describe('System Timers', () => {
  it('should have matching timeout defined', () => {
    expect(SYSTEM_TIMERS.MATCHING_TIMEOUT).toBeDefined();
    expect(SYSTEM_TIMERS.MATCHING_TIMEOUT).toBeGreaterThan(0);
  });

  it('should have rider response timeout defined', () => {
    expect(SYSTEM_TIMERS.RIDER_RESPONSE_TIMEOUT).toBeDefined();
    expect(SYSTEM_TIMERS.RIDER_RESPONSE_TIMEOUT).toBeGreaterThan(0);
  });

  it('should have pickup wait timeout defined', () => {
    expect(SYSTEM_TIMERS.PICKUP_WAIT_TIMEOUT).toBeDefined();
    expect(SYSTEM_TIMERS.PICKUP_WAIT_TIMEOUT).toBeGreaterThan(0);
  });

  it('should have heartbeat interval defined', () => {
    expect(SYSTEM_TIMERS.HEARTBEAT_INTERVAL).toBeDefined();
    expect(SYSTEM_TIMERS.HEARTBEAT_INTERVAL).toBeGreaterThan(0);
  });
});

describe('Cancellation Reason Codes', () => {
  it('should define client cancellation codes', () => {
    expect(CancellationReasonCode.CLIENT_CANCELLED).toBeDefined();
    expect(CancellationReasonCode.CLIENT_NO_SHOW).toBeDefined();
    expect(CancellationReasonCode.CLIENT_WRONG_ADDRESS).toBeDefined();
  });

  it('should define rider cancellation codes', () => {
    expect(CancellationReasonCode.RIDER_CANCELLED).toBeDefined();
    expect(CancellationReasonCode.RIDER_VEHICLE_BREAKDOWN).toBeDefined();
    expect(CancellationReasonCode.RIDER_EMERGENCY).toBeDefined();
  });

  it('should define system cancellation codes', () => {
    expect(CancellationReasonCode.SYSTEM_TIMEOUT).toBeDefined();
    expect(CancellationReasonCode.NO_RIDER_AVAILABLE).toBeDefined();
    expect(CancellationReasonCode.MATCHING_TIMEOUT).toBeDefined();
    expect(CancellationReasonCode.PAYMENT_FAILED).toBeDefined();
  });
});

describe('Helper Functions', () => {
  describe('getNextStates', () => {
    it('should return correct next states for CREATED', () => {
      const states = getNextStates('CREATED');
      expect(states).toContain('MATCHING');
      expect(states).toContain('CANCELLED');
    });

    it('should return empty array for terminal states', () => {
      expect(getNextStates('COMPLETED')).toEqual([]);
      expect(getNextStates('CANCELLED')).toEqual([]);
    });
  });

  describe('isTerminalState', () => {
    it('should return true for terminal states', () => {
      expect(isTerminalState('COMPLETED')).toBe(true);
      expect(isTerminalState('CANCELLED')).toBe(true);
      expect(isTerminalState('FAILED')).toBe(true);
    });

    it('should return false for non-terminal states', () => {
      expect(isTerminalState('CREATED')).toBe(false);
      expect(isTerminalState('MATCHING')).toBe(false);
      expect(isTerminalState('IN_TRANSIT')).toBe(false);
    });
  });

  describe('getStatusCategory', () => {
    it('should categorize pending states correctly', () => {
      expect(getStatusCategory('CREATED')).toBe('pending');
      expect(getStatusCategory('MATCHING')).toBe('pending');
      expect(getStatusCategory('ASSIGNED')).toBe('pending');
    });

    it('should categorize active states correctly', () => {
      expect(getStatusCategory('ACCEPTED')).toBe('active');
      expect(getStatusCategory('ARRIVED')).toBe('active');
      expect(getStatusCategory('IN_TRANSIT')).toBe('active');
    });

    it('should categorize terminal states correctly', () => {
      expect(getStatusCategory('COMPLETED')).toBe('completed');
      expect(getStatusCategory('CANCELLED')).toBe('cancelled');
      expect(getStatusCategory('FAILED')).toBe('failed');
    });
  });
});

console.log('✅ Task State Machine tests defined');
