# 교원 재계약 및 승진 임용 대시보드

대학 교원의 재계약 및 승진 심사 일정을 체계적으로 관리하기 위한 웹 기반 대시보드 시스템입니다.

![Version](https://img.shields.io/badge/version-2025.01.19-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 📋 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [시작하기](#시작하기)
- [사용 방법](#사용-방법)
- [프로젝트 구조](#프로젝트-구조)
- [주요 알고리즘](#주요-알고리즘)
- [버전 히스토리](#버전-히스토리)

## ✨ 주요 기능

### 1. 📅 기준 날짜 선택
- 특정 날짜를 기준으로 재계약 및 승진 현황 시뮬레이션
- 미래 시점의 상황을 미리 파악 가능
- 오늘 날짜로 빠른 복귀 기능

### 2. 🔔 재계약 알림
- **긴급 알림**: 2개월 이내 재계약 종료 대상자
- **주의 알림**: 4개월 이내 재계약 종료 대상자
- 정년퇴직 예정자는 자동 제외
- 실시간 D-day 카운터

### 3. 📊 승진 심사 알림
- 학기제 기반 승진 대상자 관리
  - **1학기 (3~8월)**: 10월 1일 승진 대상 (8월 31일 마감)
  - **2학기 (9~2월)**: 4월 1일 승진 대상 (2월 28일 마감)
- 다음 학기 승진 대상자 자동 필터링
- 휴직 기간 자동 가산 (정년트랙/비정년트랙 모두 적용)
- 징계 제한 기간 확인 (제15조의2)

### 4. 📈 통계 대시보드
- 전체 전임교원 수
- 재계약 알림 대상자 수
- 승진 심사 대상자 수
- 긴급 처리 필요 건수

### 5. 🔍 교원 현황 테이블
- 전체 교원 정보 조회
- 실시간 검색 기능
- 직급별 필터링 (교수/부교수/조교수/비정년트랙)
- 다음 심사 일정 자동 표시 (재계약/승진 구분)
- 스크롤해도 헤더 고정

### 6. 📂 엑셀 파일 업로드
- Raw data 형식 자동 인식
- 드래그 앤 드롭 지원
- 다양한 헤더 형식 자동 처리

## 🛠 기술 스택

### Frontend
- **HTML5**: 시맨틱 마크업
- **CSS3**: 
  - 글래스모피즘 디자인
  - 그라디언트 배경
  - 반응형 레이아웃
  - 마이크로 애니메이션
- **JavaScript (ES6+)**:
  - 비동기 처리
  - 날짜 연산
  - DOM 조작

### Libraries
- **SheetJS (XLSX)**: 엑셀 파일 파싱
- CDN: `https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`

### 디자인
- **컬러 스킴**: 보라-핑크 그라디언트
- **타이포그래피**: Segoe UI, sans-serif
- **반응형**: 모바일 ~ 데스크톱 (최대 1400px)

## 🚀 시작하기

### 필수 요구사항
- 모던 웹 브라우저 (Chrome, Firefox, Safari, Edge)
- JavaScript 활성화

### 설치 방법

1. **저장소 클론**
```bash
git clone https://github.com/your-username/faculty-dashboard.git
cd faculty-dashboard
```

2. **파일 구조**
```
faculty-dashboard/
├── index.html          # 메인 대시보드
└── README.md          # 문서
```

3. **실행**
- `index.html` 파일을 브라우저로 열기
- 또는 로컬 서버 실행:
```bash
python -m http.server 8000
# http://localhost:8000 접속
```

## 📖 사용 방법

### 1. 엑셀 파일 준비
교원현황 엑셀 파일에 다음 필드가 포함되어야 합니다:
- 성명
- 소속
- 직급
- 직렬
- 재직구분
- 전임교원 최초임용일
- 재임용시작일
- 재임용종료일 (또는 최초임용 종료일)
- 정년일자
- 현직급 승인일

### 2. 파일 업로드
1. 화면 상단의 업로드 영역 클릭 또는 파일 드래그
2. `.xls` 또는 `.xlsx` 파일 선택
3. 자동으로 데이터 로드 및 분석 시작

### 3. 기준 날짜 설정
- 상단 날짜 선택기에서 원하는 날짜 선택
- 또는 "오늘" 버튼으로 현재 날짜로 설정
- 선택한 날짜 기준으로 모든 알림 재계산

### 4. 알림 확인
- **재계약 알림**: 긴급/주의 대상자 목록 확인
- **승진 알림**: 다음 학기 승진 대상자 확인
- 각 카드에 대상자 수 표시

### 5. 상세 조회
- 하단 교원 현황 테이블에서 전체 데이터 확인
- 검색창에 이름, 소속, 직급 입력하여 필터링
- 직급 버튼으로 빠른 필터링

## 🏗 프로젝트 구조

### 주요 컴포넌트

#### 1. 데이터 처리
```javascript
// 엑셀 파일 로드
loadExcelFile(event)
  → parseDate()
  → getTeacherValue()
  → 데이터 정규화

// 종료일 결정
getEndDate(teacher)
  → 재임용종료일 우선
  → 없으면 최초임용종료일
```

#### 2. 날짜 연산
```javascript
// 기준 날짜 관리
currentBaseDate
  → getDaysUntil()
  → getMonthsUntil()
  → isSameDate()

// 승진 날짜 조정
adjustPromotionDate()
  → 4월 1일 또는 10월 1일로 조정
```

#### 3. 심사 판정
```javascript
// 재계약 상태
getRenewalStatus()
  → 'danger': 2개월 이내
  → 'warning': 4개월 이내
  → 'normal': 그 외

// 승진 대상 판정
getNextReviewInfo()
  → 조교수: 6년 후 승진 가능
  → 부교수: 7년 후 승진 가능
  → 날짜를 4/10월로 조정
```

#### 4. UI 업데이트
```javascript
updateDashboard()
  ├── updateStats()           // 통계 카드
  ├── updateRenewalAlerts()   // 재계약 알림
  ├── updatePromotionAlerts() // 승진 알림
  └── updateFacultyTable()    // 교원 현황 테이블
```

## 🔬 주요 알고리즘

### 재계약 판정 알고리즘
```
IF 재임용종료일 = 정년일자 THEN
    상태 = "정년퇴직 예정"
ELSE IF 종료일까지 ≤ 2개월 THEN
    상태 = "긴급"
ELSE IF 종료일까지 ≤ 4개월 THEN
    상태 = "주의"
ELSE
    상태 = "정상"
```

### 승진 소요 연한 (교원인사규정 제15조)

| 구분 | 조교수→부교수 | 부교수→교수 |
|------|--------------|------------|
| 2012.2.28 이전 정년트랙 | 4년 | 5년 |
| 2012.3.1 이후 정년트랙 | 6년 | 8년 (자체 기준) |
| 비정년트랙 (2021.4.06~) | 6년 | - |

> ※ 규정상 부교수→교수는 7년이나, 본교 자체 기준으로 8년 적용

### 승진 자격 판정 알고리즘
```
정년트랙 교원:
    기준일 = 발령사항에서 "조교수" + "최초임용" + "비정년" 미포함 발령 찾기
             없으면 전임교원 최초임용일 사용

비정년트랙 교원:
    기준일 = 발령사항에서 "조교수" + "최초임용" + "비정년" 포함 발령 찾기
             없으면 전임교원 최초임용일 사용

조교수 → 부교수:
    자격일 = 기준일 + 소요연한

부교수 → 교수:
    기준일 = 현직급승인일 (부교수 임용일)
    자격일 = 기준일 + 소요연한

휴직 기간 반영:
    최종 승진예정일 = 자격일 + 휴직기간(개월)
    ※ 정년트랙, 비정년트랙 모두 동일하게 휴직기간 가산

승진일 조정:
    IF 자격일.월 ≤ 3 THEN 해당연도 4월 1일
    ELSE IF 자격일.월 ≤ 9 THEN 해당연도 10월 1일
    ELSE 다음연도 4월 1일
```

### 징계 승진 제한 (교원인사규정 제15조의2)
```
징계처분 종료일로부터 다음 기간이 경과해야 승진 가능:
  - 정직: 18개월
  - 감봉: 12개월
  - 견책: 6개월
```

### 학기 판정 알고리즘
```
1학기 (3~8월):
    다음 학기 = 해당연도 10월 1일
    마감일 = 해당연도 8월 31일

2학기 (9~2월):
    다음 학기 = 다음연도 4월 1일
    마감일 = 다음연도 2월 28일
```

## 📝 버전 히스토리

### v2025.01.19 (최신)
- **징계처분 관리 탭 추가**: 제15조의2 징계 승진 제한 규정 적용
  - 정직 18개월, 감봉 12개월, 견책 6개월 제한
  - 수동 징계 등록/수정/삭제 기능
- **비정년트랙 휴직 기간 반영**: 정년트랙과 동일하게 휴직 기간 가산
- **예외사항 관리 개선**: 수정 기능 추가, 기타 유형 승진일 선택적 입력
- **자동 예외 등록 개선**: 휴직/징계는 자동 등록하지 않음
- **비정년트랙 임용일 계산 정확도 향상**: 발령사항 기반 판단
- **성능 개선**: 디버그 로그 조건부 실행

### v2025.01.10.03
- 승진 알림 로직 개선 (교원 현황과 완전 동일)
- 4월/10월 승진일 기준 필터링 정확도 향상

### v2025.01.10.02
- 상세 디버깅 로그 추가
- 함수 호출 추적 기능 강화

### v2025.01.10.01
- 기준 날짜 선택 기능 추가
- 학기제 기반 승진 알림 구현
- 재계약/승진 구분 표시
- 정년퇴직 예정자 필터링
- 헤더 고정 기능

## 🎯 향후 개선 계획

- [ ] 데이터 내보내기 기능 (Excel/PDF)
- [ ] 알림 이메일 발송 기능
- [ ] 교원별 상세 이력 팝업
- [ ] 승진 심사 기준 시각화
- [ ] 다크모드 지원
- [ ] 다국어 지원 (영어)

## 📄 라이선스

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.

## 🙏 감사의 말

이 프로젝트는 대학 교원 인사 관리의 효율성을 높이기 위해 개발되었습니다.

---

**Made with ❤️ for Better Faculty Management**
