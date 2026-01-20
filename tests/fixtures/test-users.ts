/**
 * 테스트 사용자 데이터
 *
 * 각 사용자는 특정 상태를 가지며, 해당 상태에 따라 앱 화면이 다르게 표시됩니다.
 * 새로운 테스트 계정이 추가되면 여기에 등록하세요.
 */

export type UserState =
  | 'new'           // 신규 가입 (여권 미등록)
  | 'passport_registered'  // 여권 등록 완료
  | 'arc_pending'   // 외국인등록증 심사 중
  | 'arc_verified'  // 외국인등록증 인증 완료
  | 'plan_subscribed'  // 요금제 가입 완료
  | 'inactive';     // 비활성 계정

export interface TestUser {
  email: string;
  password: string;
  state: UserState;
  description: string;
  expectedFeatures?: {
    home?: HomePageFeatures;
    myPage?: MyPageFeatures;
  };
}

export interface HomePageFeatures {
  showPassportRegistration: boolean;  // 여권 등록 카드 표시
  showArcConnection: boolean;         // 외국인등록증 연결 표시
  showPlanInfo: boolean;              // 요금제 정보 표시
  showPlanSelection: boolean;         // 요금제 선택 버튼 표시
}

export interface MyPageFeatures {
  showPoints: boolean;    // 포인트 표시
  showPaymentHistory: boolean;  // 결제 내역 표시
}

/**
 * 테스트 사용자 목록
 *
 * 사용 예시:
 *   import { testUsers } from '../fixtures/test-users';
 *   await loginPage.login(testUsers.newUser.email, testUsers.newUser.password);
 */
export const testUsers: Record<string, TestUser> = {
  /**
   * 신규 사용자 - 여권 미등록 상태
   * 홈 화면에서 "여권을 등록해 주세요" 카드가 표시됨
   */
  newUser: {
    email: 'test21@aaaa.com',
    password: 'qwer1234',
    state: 'new',
    description: '신규 가입 사용자 (여권 미등록)',
    expectedFeatures: {
      home: {
        showPassportRegistration: true,
        showArcConnection: false,
        showPlanInfo: false,
        showPlanSelection: true,
      },
      myPage: {
        showPoints: true,
        showPaymentHistory: true,
      }
    }
  },

  /**
   * 여권 등록 완료 사용자
   * 홈 화면에서 외국인등록증 연결 안내가 표시됨
   */
  passportRegistered: {
    email: 'passport_done@test.com',
    password: 'password123',
    state: 'passport_registered',
    description: '여권 등록 완료 사용자',
    expectedFeatures: {
      home: {
        showPassportRegistration: false,
        showArcConnection: true,
        showPlanInfo: false,
        showPlanSelection: true,
      },
      myPage: {
        showPoints: true,
        showPaymentHistory: true,
      }
    }
  },

  /**
   * 외국인등록증 심사 중 사용자
   */
  arcPending: {
    email: 'arc_pending@test.com',
    password: 'password123',
    state: 'arc_pending',
    description: '외국인등록증 심사 중',
    expectedFeatures: {
      home: {
        showPassportRegistration: false,
        showArcConnection: true,
        showPlanInfo: false,
        showPlanSelection: true,
      },
      myPage: {
        showPoints: true,
        showPaymentHistory: true,
      }
    }
  },

  /**
   * 외국인등록증 인증 완료 사용자
   */
  arcVerified: {
    email: 'arc_verified@test.com',
    password: 'password123',
    state: 'arc_verified',
    description: '외국인등록증 인증 완료',
    expectedFeatures: {
      home: {
        showPassportRegistration: false,
        showArcConnection: false,
        showPlanInfo: false,
        showPlanSelection: true,
      },
      myPage: {
        showPoints: true,
        showPaymentHistory: true,
      }
    }
  },

  /**
   * 요금제 가입 완료 사용자
   */
  planSubscribed: {
    email: 'subscribed@test.com',
    password: 'password123',
    state: 'plan_subscribed',
    description: '요금제 가입 완료',
    expectedFeatures: {
      home: {
        showPassportRegistration: false,
        showArcConnection: false,
        showPlanInfo: true,
        showPlanSelection: false,
      },
      myPage: {
        showPoints: true,
        showPaymentHistory: true,
      }
    }
  },

  // ========================================
  // AI QA 테스트 계정 (자동 생성됨)
  // ========================================

  /**
   * AI QA 테스트 계정 1
   */
  aiqa1: {
    email: 'aiqa1@aaa.com',
    password: 'qwer1234',
    state: 'new',
    description: 'AI QA 테스트 계정 1',
  },

  /**
   * AI QA 테스트 계정 2
   */
  aiqa2: {
    email: 'aiqa2@aaa.com',
    password: 'qwer1234',
    state: 'new',
    description: 'AI QA 테스트 계정 2',
  },

  /**
   * AI QA 테스트 계정 3
   */
  aiqa3: {
    email: 'aiqa3@aaa.com',
    password: 'qwer1234',
    state: 'new',
    description: 'AI QA 테스트 계정 3',
  },

  /**
   * AI QA 테스트 계정 4
   */
  aiqa4: {
    email: 'aiqa4@aaa.com',
    password: 'qwer1234',
    state: 'new',
    description: 'AI QA 테스트 계정 4',
  },

  /**
   * AI QA 테스트 계정 5
   */
  aiqa5: {
    email: 'aiqa5@aaa.com',
    password: 'qwer1234',
    state: 'new',
    description: 'AI QA 테스트 계정 5',
  },

  /**
   * AI QA 테스트 계정 6
   */
  aiqa6: {
    email: 'aiqa6@aaa.com',
    password: 'qwer1234',
    state: 'new',
    description: 'AI QA 테스트 계정 6',
  },
};

/**
 * 특정 상태의 사용자 가져오기
 */
export function getUserByState(state: UserState): TestUser | undefined {
  return Object.values(testUsers).find(user => user.state === state);
}

/**
 * 기본 테스트 사용자 (가장 많이 사용)
 */
export const defaultUser = testUsers.newUser;
