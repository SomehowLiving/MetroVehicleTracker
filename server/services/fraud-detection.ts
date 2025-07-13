// services/fraud-detection.ts - Fraud detection algorithms

export interface FraudCheck {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  detected: boolean;
}

export class FraudDetectionService {

  static detectFraud(checkinData: {
    openingKm?: number;
    closingKm?: number;
    openingKmTimestamp?: Date;
    closingKmTimestamp?: Date;
    vehicleNumber: string;
    previousCheckins?: Array<{
      openingKm?: number;
      closingKm?: number;
      openingKmTimestamp?: Date;
      closingKmTimestamp?: Date;
    }>;
  }): FraudCheck[] {

    const fraudChecks: FraudCheck[] = [];

    // 1. Same Opening and Closing KM
    if (checkinData.openingKm && checkinData.closingKm) {
      if (checkinData.openingKm === checkinData.closingKm) {
        fraudChecks.push({
          type: 'SAME_KM_READING',
          severity: 'high',
          description: `Opening KM (${checkinData.openingKm}) and Closing KM (${checkinData.closingKm}) are identical`,
          detected: true
        });
      }
    }

    // 2. Closing KM less than Opening KM
    if (checkinData.openingKm && checkinData.closingKm) {
      if (checkinData.closingKm < checkinData.openingKm) {
        fraudChecks.push({
          type: 'REVERSE_KM_READING',
          severity: 'high',
          description: `Closing KM (${checkinData.closingKm}) is less than Opening KM (${checkinData.openingKm})`,
          detected: true
        });
      }
    }

    // 3. Unrealistic KM difference (more than 500km in a day)
    if (checkinData.openingKm && checkinData.closingKm) {
      const kmDiff = checkinData.closingKm - checkinData.openingKm;
      if (kmDiff > 500) {
        fraudChecks.push({
          type: 'UNREALISTIC_DISTANCE',
          severity: 'medium',
          description: `KM difference (${kmDiff}km) seems unrealistic for a single trip`,
          detected: true
        });
      }
    }

    // 4. KM entered at the same time (both opening and closing)
    if (checkinData.openingKmTimestamp && checkinData.closingKmTimestamp) {
      const timeDiff = Math.abs(checkinData.closingKmTimestamp.getTime() - checkinData.openingKmTimestamp.getTime());
      if (timeDiff < 60000) { // Less than 1 minute
        fraudChecks.push({
          type: 'SIMULTANEOUS_KM_ENTRY',
          severity: 'high',
          description: `Opening and closing KM entered within 1 minute of each other`,
          detected: true
        });
      }
    }

    // 5. KM inconsistency with previous trips
    if (checkinData.previousCheckins && checkinData.previousCheckins.length > 0) {
      const lastCheckin = checkinData.previousCheckins[0];
      if (lastCheckin.closingKm && checkinData.openingKm) {
        const expectedMinKm = lastCheckin.closingKm;
        if (checkinData.openingKm < expectedMinKm - 10) { // Allow 10km tolerance
          fraudChecks.push({
            type: 'KM_INCONSISTENCY',
            severity: 'medium',
            description: `Opening KM (${checkinData.openingKm}) is inconsistent with previous closing KM (${lastCheckin.closingKm})`,
            detected: true
          });
        }
      }
    }

    // 6. Round number pattern (ending in 000, 500, etc.)
    if (checkinData.openingKm && checkinData.closingKm) {
      const isRoundOpening = checkinData.openingKm % 100 === 0;
      const isRoundClosing = checkinData.closingKm % 100 === 0;

      if (isRoundOpening && isRoundClosing) {
        fraudChecks.push({
          type: 'ROUND_NUMBER_PATTERN',
          severity: 'low',
          description: `Both opening and closing KM are round numbers (${checkinData.openingKm}, ${checkinData.closingKm})`,
          detected: true
        });
      }
    }

    // 7. Very short trip time with high KM
    if (checkinData.openingKmTimestamp && 
        checkinData.closingKmTimestamp && 
        checkinData.openingKm && 
        checkinData.closingKm) {

      const timeDiffHours = (checkinData.closingKmTimestamp.getTime() - checkinData.openingKmTimestamp.getTime()) / (1000 * 60 * 60);
      const kmDiff = checkinData.closingKm - checkinData.openingKm;

      if (timeDiffHours > 0 && kmDiff > 0) {
        const avgSpeed = kmDiff / timeDiffHours;
        if (avgSpeed > 80) { // More than 80 km/h average
          fraudChecks.push({
            type: 'UNREALISTIC_SPEED',
            severity: 'medium',
            description: `Average speed (${avgSpeed.toFixed(1)} km/h) seems unrealistic for delivery vehicle`,
            detected: true
          });
        }
      }
    }

    return fraudChecks;
  }

  static calculateFraudScore(fraudChecks: FraudCheck[]): number {
    const severityWeights = { low: 1, medium: 3, high: 5 };
    return fraudChecks.reduce((total, check) => {
      return total + (check.detected ? severityWeights[check.severity] : 0);
    }, 0);
  }

  static isFraudulent(fraudChecks: FraudCheck[]): boolean {
    return fraudChecks.some(check => check.detected && check.severity === 'high') ||
           this.calculateFraudScore(fraudChecks) >= 4;
  }
}