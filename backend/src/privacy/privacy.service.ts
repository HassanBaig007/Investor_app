import { Injectable } from '@nestjs/common';

@Injectable()
export class PrivacyService {
  /**
   * Mask investor data based on privacy settings and viewer role
   */
  getVisibleInvestorData(
    investor: any,
    projectId: string,
    viewerId: string,
    isViewerAdmin: boolean,
  ) {
    // Self always sees own full data
    if (investor.id === viewerId || investor._id?.toString() === viewerId) {
      return {
        ...investor,
        isAnonymous: false,
        isSelf: true,
        visibilityLevel: 'full',
      };
    }

    const privacySettings = investor.privacySettings || {};
    const projectPrivacy = privacySettings[projectId] || {};
    const isAnonymous = projectPrivacy.isAnonymous === true;

    // Admin sees everything with anonymous indicator
    if (isViewerAdmin) {
      return {
        ...investor,
        isAnonymous,
        isSelf: false,
        visibilityLevel: 'admin',
      };
    }

    // Co-investor sees masked data if anonymous
    if (isAnonymous) {
      return {
        id: investor.id || investor._id,
        name: projectPrivacy.displayName || 'Anonymous Investor',
        email: '••••••••@••••.com',
        avatar: null,
        totalInvested: projectPrivacy.showInvestmentAmount
          ? investor.totalInvested
          : null,
        isAnonymous: true,
        isSelf: false,
        visibilityLevel: 'anonymous',
      };
    }

    // Not anonymous - show full data
    return {
      ...investor,
      isAnonymous: false,
      isSelf: false,
      visibilityLevel: 'full',
    };
  }
}
