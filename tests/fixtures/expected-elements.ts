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
      '본인 확인을 위해 여권을 등록해 주세요',
      '정보 등록하기',
      '유심 무료 제공 요금제',
      '이심 무료 설치 요금제',
      '통신',
      '공항',
    ],
    shouldBeHidden: [
      '내 요금제',
      '요금제 이용 중',
    ],
    optionalElements: [
      '주소록',
    ],
  },

  passport_registered: {
    shouldBeVisible: [
      '외국인등록증',
      '유심 무료 제공 요금제',
      '이심 무료 설치 요금제',
    ],
    shouldBeHidden: [
      '여권을 등록해 주세요',
      '내 요금제',
    ],
  },

  arc_pending: {
    shouldBeVisible: [
      '심사 중',
      '유심 무료 제공 요금제',
    ],
    shouldBeHidden: [
      '여권을 등록해 주세요',
    ],
  },

  arc_verified: {
    shouldBeVisible: [
      '유심 무료 제공 요금제',
      '이심 무료 설치 요금제',
    ],
    shouldBeHidden: [
      '여권을 등록해 주세요',
      '외국인등록증 연결',
    ],
  },

  plan_subscribed: {
    shouldBeVisible: [
      '내 요금제',
      '이용 중',
    ],
    shouldBeHidden: [
      '여권을 등록해 주세요',
      '유심 무료 제공 요금제',
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
      '서비스를 확인해 보세요',
      '전화번호에 외국인등록증 연결하기',
    ],
    shouldBeHidden: [],
  },

  passport_registered: {
    shouldBeVisible: [
      '서비스를 확인해 보세요',
      '전화번호에 외국인등록증 연결하기',
    ],
    shouldBeHidden: [],
  },

  arc_pending: {
    shouldBeVisible: [
      '심사가 진행',
    ],
    shouldBeHidden: [],
  },

  arc_verified: {
    shouldBeVisible: [
      '서비스를 확인해 보세요',
    ],
    shouldBeHidden: [
      '외국인등록증 연결하기',
    ],
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
      '내 보유 포인트',
      '결제 내역',
      '헬프 센터',
      '로그아웃',
    ],
    shouldBeHidden: [],
  },

  passport_registered: {
    shouldBeVisible: [
      '내 보유 포인트',
      '결제 내역',
      '헬프 센터',
      '로그아웃',
    ],
    shouldBeHidden: [],
  },

  arc_pending: {
    shouldBeVisible: [
      '내 보유 포인트',
      '결제 내역',
      '로그아웃',
    ],
    shouldBeHidden: [],
  },

  arc_verified: {
    shouldBeVisible: [
      '내 보유 포인트',
      '결제 내역',
      '로그아웃',
    ],
    shouldBeHidden: [],
  },

  plan_subscribed: {
    shouldBeVisible: [
      '내 보유 포인트',
      '결제 내역',
      '내 요금제',
      '로그아웃',
    ],
    shouldBeHidden: [],
  },

  inactive: {
    shouldBeVisible: [],
    shouldBeHidden: [],
  },
};
