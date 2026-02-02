/**
 * 상태별 예상 UI 요소
 *
 * 사용자 상태에 따라 화면에 표시되어야 하는/표시되지 않아야 하는 요소들을 정의합니다.
 */

import type { UserState } from './test-users';

export interface ExpectedElements {
  shouldBeVisible: string[];   // 화면에 보여야 하는 텍스트/요소
  shouldBeHidden: string[];    // 화면에 보이지 않아야 하는 텍스트/요소
  optionalElements?: string[]; // 조건부로 표시될 수 있는 요소
}

/**
 * 홈 페이지 상태별 예상 요소
 */
export const homePageExpectedElements: Record<UserState, ExpectedElements> = {
  new: {
    shouldBeVisible: [
      // 여권 등록 안내 (영어/한국어)
      '여권',  // "본인 확인을 위해 여권을 등록해 주세요" 또는 "Register your passport"
      // 정보 등록 버튼 (영어/한국어)
      '등록',  // "정보 등록하기" 또는 "Register Information"
      // 요금제 관련 - 새 UI에서는 USIM/ESIM 텍스트 사용
      'USIM',
      'ESIM',
    ],
    shouldBeHidden: [
      '내 요금제',  // My Plan
    ],
    optionalElements: [
      '주소록',  // Contact
    ],
  },

  passport_registered: {
    shouldBeVisible: [
      '외국인등록증',  // 외국인등록증 (Residence Card / ARC)
      'USIM',
      'ESIM',
    ],
    shouldBeHidden: [
      '여권을 등록',  // 여권 등록 안내가 숨겨져야 함
    ],
  },

  arc_pending: {
    shouldBeVisible: [
      '심사',  // 심사 중 / Under review
      'USIM',
    ],
    shouldBeHidden: [
      '여권을 등록',
    ],
  },

  arc_verified: {
    shouldBeVisible: [
      'USIM',
      'ESIM',
    ],
    shouldBeHidden: [
      '여권을 등록',
    ],
  },

  plan_subscribed: {
    shouldBeVisible: [
      '요금제',  // 내 요금제 / My Plan
    ],
    shouldBeHidden: [
      '여권을 등록',
    ],
  },

  inactive: {
    shouldBeVisible: [],
    shouldBeHidden: [],
  },
};

/**
 * 혜택 페이지 상태별 예상 요소
 */
export const benefitPageExpectedElements: Record<UserState, ExpectedElements> = {
  new: {
    shouldBeVisible: [
      // 서비스 확인 안내
      '서비스',  // "Check our services" or "서비스를 확인해 보세요"
      '외국인등록증',  // "Connect phone number to RC" or "전화번호에 외국인등록증 연결하기"
    ],
    shouldBeHidden: [],
  },

  passport_registered: {
    shouldBeVisible: [
      '서비스',
      '외국인등록증',
    ],
    shouldBeHidden: [],
  },

  arc_pending: {
    shouldBeVisible: [
      '심사',  // 심사가 진행 / under review
    ],
    shouldBeHidden: [],
  },

  arc_verified: {
    shouldBeVisible: [
      '서비스',
    ],
    shouldBeHidden: [],
  },

  plan_subscribed: {
    shouldBeVisible: [],
    shouldBeHidden: [],
  },

  inactive: {
    shouldBeVisible: [],
    shouldBeHidden: [],
  },
};

/**
 * 마이페이지 상태별 예상 요소
 */
export const myPageExpectedElements: Record<UserState, ExpectedElements> = {
  new: {
    shouldBeVisible: [
      '포인트',  // 내 보유 포인트 / My Points
      '결제',  // 결제 내역 / Payment History
      '헬프',  // 헬프 센터 / Help Center
      '로그아웃',  // 로그아웃 / Logout
    ],
    shouldBeHidden: [],
  },

  passport_registered: {
    shouldBeVisible: [
      '포인트',
      '결제',
      '헬프',
      '로그아웃',
    ],
    shouldBeHidden: [],
  },

  arc_pending: {
    shouldBeVisible: [
      '포인트',
      '결제',
      '로그아웃',
    ],
    shouldBeHidden: [],
  },

  arc_verified: {
    shouldBeVisible: [
      '포인트',
      '결제',
      '로그아웃',
    ],
    shouldBeHidden: [],
  },

  plan_subscribed: {
    shouldBeVisible: [
      '포인트',
      '결제',
      '요금제',  // 내 요금제 / My Plan
      '로그아웃',
    ],
    shouldBeHidden: [],
  },

  inactive: {
    shouldBeVisible: [],
    shouldBeHidden: [],
  },
};
