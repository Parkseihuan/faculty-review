/**
 * 승진 로직 엔진
 * 교원인사규정 제15조, 제16조에 따른 승진 대상자 계산
 */

class PromotionEngine {
    constructor(baseDate = new Date()) {
        this.baseDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

        // 교원인사규정 제15조 - 승진 소요 연한
        this.PROMOTION_REQUIREMENTS = {
            // 2012.3.1 이후 신규임용 정년트랙
            'after_2012': {
                '조교수': { nextRank: '부교수', years: 6 },
                '부교수': { nextRank: '교수', years: 7 }
            },
            // 2012.2.28 이전 신규임용 정년트랙
            'before_2012': {
                '조교수': { nextRank: '부교수', years: 4 },
                '부교수': { nextRank: '교수', years: 5 }
            },
            // 비정년트랙
            'non_tenure': {
                '조교수': { nextRank: '부교수', years: 6 }
            }
        };

        // 2012.3.1 기준일
        this.CUTOFF_DATE = new Date(2012, 2, 1); // 2012년 3월 1일
    }

    /**
     * 교원의 임용 구분 확인 (2012.2.28 전/후)
     */
    getAppointmentType(teacher) {
        const firstAppointment = DateUtils.parseDate(this.getTeacherValue(teacher, '전임교원\n최초임용일'));

        if (!firstAppointment) return null;

        // 비정년트랙 확인
        const rank = teacher['직급'];
        if (rank && rank.includes('비정년')) {
            return 'non_tenure';
        }

        // 2012.3.1 기준으로 구분
        if (firstAppointment < this.CUTOFF_DATE) {
            return 'before_2012';
        } else {
            return 'after_2012';
        }
    }

    /**
     * 헤더명 정규화 (개행문자 처리)
     */
    getTeacherValue(teacher, fieldName) {
        const possibleKeys = [
            fieldName,
            fieldName.replace(/\r?\n/g, ''),
            fieldName.replace(/\r?\n/g, '\r\n'),
            fieldName.replace(/\r?\n/g, '\n')
        ];

        for (const key of possibleKeys) {
            if (teacher[key] !== undefined && teacher[key] !== null) {
                return teacher[key];
            }
        }
        return null;
    }

    /**
     * 현재 직급에서의 재직 기간 계산 (년 단위)
     */
    getYearsInCurrentRank(teacher) {
        const rank = teacher['직급'];
        let baseDate;

        if (rank && rank.includes('부교수')) {
            // 부교수의 경우 현직급 승인일 사용
            const currentRankDate = DateUtils.parseDate(this.getTeacherValue(teacher, '현직급\n승인일'));
            baseDate = currentRankDate || DateUtils.parseDate(this.getTeacherValue(teacher, '전임교원\n최초임용일'));
        } else {
            // 조교수의 경우 최초임용일 사용
            baseDate = DateUtils.parseDate(this.getTeacherValue(teacher, '전임교원\n최초임용일'));
        }

        if (!baseDate) return null;

        const diffTime = this.baseDate - baseDate;
        const years = diffTime / (1000 * 60 * 60 * 24 * 365.25);

        return years;
    }

    /**
     * 승진 자격일 계산
     */
    getPromotionEligibleDate(teacher) {
        const appointmentType = this.getAppointmentType(teacher);
        if (!appointmentType) return null;

        const rank = teacher['직급'];
        if (!rank) return null;

        // 현재 직급에 대한 승진 요건 확인
        let currentRankKey = rank;
        if (rank.includes('조교수')) currentRankKey = '조교수';
        else if (rank.includes('부교수')) currentRankKey = '부교수';
        else if (rank.includes('교수')) return null; // 교수는 더 이상 승진 없음
        else return null;

        const requirement = this.PROMOTION_REQUIREMENTS[appointmentType][currentRankKey];
        if (!requirement) return null;

        // 기준일 계산
        let baseDate;
        if (currentRankKey === '부교수') {
            const currentRankDate = DateUtils.parseDate(this.getTeacherValue(teacher, '현직급\n승인일'));
            baseDate = currentRankDate || DateUtils.parseDate(this.getTeacherValue(teacher, '전임교원\n최초임용일'));
        } else {
            baseDate = DateUtils.parseDate(this.getTeacherValue(teacher, '전임교원\n최초임용일'));
        }

        if (!baseDate) return null;

        // 승진 자격일 계산
        const eligibleDate = new Date(baseDate);
        eligibleDate.setFullYear(eligibleDate.getFullYear() + requirement.years);

        return eligibleDate;
    }

    /**
     * 승진일을 4월 1일 또는 10월 1일로 조정
     * 교원인사규정 제16조
     */
    adjustToPromotionDate(eligibleDate) {
        if (!eligibleDate) return null;

        const year = eligibleDate.getFullYear();
        const month = eligibleDate.getMonth() + 1;

        // 자격일이 속한 달에 따라 다음 승진일 결정
        if (month <= 3) {
            // 1~3월: 해당년도 4월 1일
            return new Date(year, 3, 1);
        } else if (month <= 9) {
            // 4~9월: 해당년도 10월 1일
            return new Date(year, 9, 1);
        } else {
            // 10~12월: 다음년도 4월 1일
            return new Date(year + 1, 3, 1);
        }
    }

    /**
     * 다음 승진일 계산
     */
    getNextPromotionDate(teacher) {
        const eligibleDate = this.getPromotionEligibleDate(teacher);
        if (!eligibleDate) return null;

        const promotionDate = this.adjustToPromotionDate(eligibleDate);

        // 기준일보다 이전이면 null (이미 지난 승진일)
        if (promotionDate && promotionDate < this.baseDate) {
            return null;
        }

        return promotionDate;
    }

    /**
     * 승진 제한 사유 확인
     * 교원인사규정 제15조의2
     */
    checkPromotionRestrictions(teacher) {
        // TODO: 실제 데이터에 징계, 휴직 정보가 있다면 여기서 확인
        // 현재는 기본적으로 제한 없음으로 처리
        return {
            isRestricted: false,
            reason: null
        };
    }

    /**
     * 승진 대상자 여부 판정
     */
    isPromotionCandidate(teacher) {
        // 1. 직급 확인 (교수는 제외)
        const rank = teacher['직급'];

        // 교수가 아닌 조교수, 부교수만 대상
        if (!rank) {
            console.log('직급 없음:', teacher['성명']);
            return false;
        }

        // 교수는 더 이상 승진이 없음
        if (rank.includes('교수') && !rank.includes('조교수') && !rank.includes('부교수')) {
            return false;
        }

        // 2. 다음 승진일 계산
        const nextPromotionDate = this.getNextPromotionDate(teacher);
        if (!nextPromotionDate) {
            console.log('승진일 없음:', teacher['성명'], rank);
            return false;
        }

        // 3. 승진 제한 사유 확인
        const restriction = this.checkPromotionRestrictions(teacher);
        if (restriction.isRestricted) {
            return false;
        }

        console.log('✅ 승진 대상자:', teacher['성명'], rank, '→ 승진일:', this.adjustToPromotionDate(nextPromotionDate));
        return true;
    }

    /**
     * 승진 대상자 정보 조회
     */
    getPromotionInfo(teacher) {
        const appointmentType = this.getAppointmentType(teacher);
        const rank = teacher['직급'];
        const yearsInRank = this.getYearsInCurrentRank(teacher);
        const eligibleDate = this.getPromotionEligibleDate(teacher);
        const nextPromotionDate = this.getNextPromotionDate(teacher);
        const restriction = this.checkPromotionRestrictions(teacher);

        // 승진 요건 정보
        let requirement = null;
        if (appointmentType && rank) {
            let currentRankKey = rank;
            if (rank.includes('조교수')) currentRankKey = '조교수';
            else if (rank.includes('부교수')) currentRankKey = '부교수';

            requirement = this.PROMOTION_REQUIREMENTS[appointmentType]?.[currentRankKey];
        }

        // 서류 제출 마감일 (승진일 2개월 전 말일)
        let submissionDeadline = null;
        if (nextPromotionDate) {
            const promotionMonth = nextPromotionDate.getMonth();
            if (promotionMonth === 3) { // 4월 승진
                submissionDeadline = new Date(nextPromotionDate.getFullYear(), 1,
                    DateUtils.isLeapYear(nextPromotionDate.getFullYear()) ? 29 : 28);
            } else if (promotionMonth === 9) { // 10월 승진
                submissionDeadline = new Date(nextPromotionDate.getFullYear(), 7, 31);
            }
        }

        return {
            isCandidate: this.isPromotionCandidate(teacher),
            appointmentType,
            currentRank: rank,
            yearsInRank: yearsInRank ? yearsInRank.toFixed(1) : null,
            requirement,
            eligibleDate,
            nextPromotionDate,
            submissionDeadline,
            daysUntilPromotion: nextPromotionDate ? DateUtils.getDaysUntil(nextPromotionDate, this.baseDate) : null,
            daysUntilDeadline: submissionDeadline ? DateUtils.getDaysUntil(submissionDeadline, this.baseDate) : null,
            restriction
        };
    }

    /**
     * 다음 승진 시기 확인 (4월 또는 10월)
     */
    getNextPromotionPeriod() {
        const month = this.baseDate.getMonth() + 1;
        const year = this.baseDate.getFullYear();

        if (month >= 9 || month <= 2) {
            // 9월~2월: 다음 4월 승진 준비 기간
            const nextYear = month >= 9 ? year + 1 : year;
            return {
                period: 'april',
                promotionDate: new Date(nextYear, 3, 1),
                deadline: new Date(nextYear, 1, DateUtils.isLeapYear(nextYear) ? 29 : 28)
            };
        } else {
            // 3월~8월: 다음 10월 승진 준비 기간
            return {
                period: 'october',
                promotionDate: new Date(year, 9, 1),
                deadline: new Date(year, 7, 31)
            };
        }
    }

    /**
     * 모든 교원의 승진 정보 계산
     */
    calculateAllPromotions(facultyData) {
        console.log('=== 승진 대상자 계산 시작 ===');
        console.log('전체 교원 수:', facultyData.length);

        // 직급별 통계
        const rankStats = {};
        facultyData.forEach(t => {
            const rank = t['직급'] || '직급없음';
            rankStats[rank] = (rankStats[rank] || 0) + 1;
        });
        console.log('직급별 통계:', rankStats);

        const results = facultyData.map(teacher => ({
            teacher,
            promotionInfo: this.getPromotionInfo(teacher)
        })).filter(item => item.promotionInfo.isCandidate);

        console.log('최종 승진 대상자 수:', results.length);
        console.log('=== 승진 대상자 계산 완료 ===');

        return results;
    }

    /**
     * 승진 시기별 그룹화
     */
    groupByPromotionPeriod(promotionCandidates) {
        const groups = {
            april: [],
            october: []
        };

        promotionCandidates.forEach(candidate => {
            const promotionDate = candidate.promotionInfo.nextPromotionDate;
            if (promotionDate) {
                const month = promotionDate.getMonth();
                if (month === 3) { // 4월
                    groups.april.push(candidate);
                } else if (month === 9) { // 10월
                    groups.october.push(candidate);
                }
            }
        });

        return groups;
    }

    /**
     * 통계 계산
     */
    calculateStatistics(promotionCandidates) {
        const groups = this.groupByPromotionPeriod(promotionCandidates);
        const nextPeriod = this.getNextPromotionPeriod();

        // 마감 임박 대상자 (D-30 이내)
        const urgentCandidates = promotionCandidates.filter(candidate => {
            const daysUntilDeadline = candidate.promotionInfo.daysUntilDeadline;
            return daysUntilDeadline !== null && daysUntilDeadline <= 30 && daysUntilDeadline >= 0;
        });

        // 제한 대상자
        const restrictedCandidates = promotionCandidates.filter(candidate =>
            candidate.promotionInfo.restriction.isRestricted
        );

        return {
            total: promotionCandidates.length,
            aprilCount: groups.april.length,
            octoberCount: groups.october.length,
            urgentCount: urgentCandidates.length,
            restrictedCount: restrictedCandidates.length,
            nextPeriod,
            groups,
            urgentCandidates,
            restrictedCandidates
        };
    }
}

// 전역 객체로 내보내기
window.PromotionEngine = PromotionEngine;
