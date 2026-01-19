/**
 * 승진 로직 엔진
 * 교원인사규정 제15조, 제16조에 따른 승진 대상자 계산
 *
 * ================================================================================================
 * 교원인사규정 제15조 [자격 및 절차] - 승진 소요 연한 (2021.4.06 개정)
 * ================================================================================================
 *
 * 1. 정년트랙 교원 - 2012.2.28 이전 신규임용
 *    - 조교수 → 부교수: 4년
 *    - 부교수 → 교수: 5년
 *
 * 2. 정년트랙 교원 - 2012.3.1 이후 신규임용
 *    - 조교수 → 부교수: 6년
 *    - 부교수 → 교수: 7년 (규정) → 8년 (자체 기준 적용) ★
 *
 * 3. 비정년트랙 교원 (2021.4.06 신설)
 *    - 조교수 → 부교수: 6년
 *    - 부교수 → 교수: 규정 없음 (승진 불가)
 *
 * ================================================================================================
 * 휴직 기간 처리 (제15조 제1항)
 * ================================================================================================
 *
 * "승진소요연한산정시 본인의 원에의한휴직기간 및공무로 인한휴직기간은
 *  다음각호의 승진소요연한에 산입하지아니한다"
 *
 * ★ 중요: 이 규정은 정년트랙 교원에만 적용
 *
 * - 정년트랙: 휴직 기간(출산휴가, 육아휴직 등)을 승진예정일에 가산
 * - 비정년트랙: 임용계약 기반이므로 휴직 기간 미반영
 *   예) 함지선 교수(교육대학원, 비정년트랙, 2021.4.06 이후 규정 적용)
 *       출산휴가로 휴직했으나 승진일에 반영하지 않음
 *
 * ================================================================================================
 * 승진 시기 (제16조)
 * ================================================================================================
 *
 * 교원의 승진시기는 매학년도 4월 1일과 10월 1일에 승진임용한다.
 *
 * ================================================================================================
 */

// 디버그 모드 (false로 설정하면 console.log 비활성화)
const PROMOTION_DEBUG = false;

class PromotionEngine {
    constructor(baseDate = new Date()) {
        this.baseDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

        // 교원인사규정 제15조 - 승진 소요 연한
        // 교원인사규정 제15조 [자격 및 절차]
        //
        // ※ 중요: 부교수 → 교수 소요연한
        //   - 규정상: 7년 (제15조 제1항 제2호)
        //   - 자체 기준: 8년 (실제 운용)
        this.PROMOTION_REQUIREMENTS = {
            // 2012.3.1 이후 신규임용 정년트랙 교원
            'after_2012': {
                '조교수': { nextRank: '부교수', years: 6 },  // 규정 제15조 제1항 제2호-1)
                '부교수': { nextRank: '교수', years: 8 }      // 자체 기준 8년 (규정 7년)
            },
            // 2012.2.28 이전 신규임용 정년트랙 교원
            'before_2012': {
                '조교수': { nextRank: '부교수', years: 4 },  // 규정 제15조 제1항 제1호-1)
                '부교수': { nextRank: '교수', years: 5 }      // 규정 제15조 제1항 제1호-2)
            },
            // 비정년트랙 교원 (2021.4.06 신설)
            'non_tenure': {
                '조교수': { nextRank: '부교수', years: 6 }   // 규정 제15조 제1항 제3호-1)
                // 부교수 → 교수 규정 없음 (비정년트랙은 교수 승진 불가)
            }
        };

        // 예외 사항 저장소 (로컬 스토리지)
        this.EXCEPTIONS_KEY = 'promotionExceptions';
        this.APPOINTMENT_DATA_KEY = 'appointmentData';

        // 2012.3.1 기준일
        this.CUTOFF_DATE = new Date(2012, 2, 1); // 2012년 3월 1일
    }

    /**
     * 교원의 발령사항 데이터 조회
     */
    getAppointmentHistory(teacher) {
        const appointmentData = JSON.parse(localStorage.getItem(this.APPOINTMENT_DATA_KEY) || '{}');
        const name = teacher['성명'];
        const department = teacher['소속'];
        const key = `${name}_${department}`;

        return appointmentData[key] || null;
    }

    /**
     * 휴직 기간 계산 (개월 수)
     * 교원인사규정 제15조 - 휴직 기간은 승진 소요 연한에서 제외
     */
    calculateLeaveMonths(teacher) {
        const appointmentHistory = this.getAppointmentHistory(teacher);

        if (!appointmentHistory || !appointmentHistory.appointments) {
            return 0;
        }

        let totalLeaveMonths = 0;

        appointmentHistory.appointments.forEach(record => {
            const appointmentType = (record['발령구분'] || '').toString().toLowerCase();

            // 휴직 관련 발령 확인
            if (appointmentType.includes('휴직')) {
                // 휴직 기간(년), 휴직 기간(월) 필드 확인
                const leaveYears = parseFloat(record['휴직기간(년)']) || 0;
                const leaveMonths = parseFloat(record['휴직기간(월)']) || 0;

                totalLeaveMonths += (leaveYears * 12) + leaveMonths;

                // 휴직 시작일/종료일로 계산 (위 필드가 없는 경우)
                if (totalLeaveMonths === 0) {
                    const startDate = this.parseDate(record['휴직시작일']);
                    const endDate = this.parseDate(record['휴직종료일']);

                    if (startDate && endDate) {
                        const months = this.getMonthsDifference(startDate, endDate);
                        totalLeaveMonths += months;
                    } else {
                        // 발령시작일/종료일로 계산
                        const apptStart = this.parseDate(record['발령시작일']);
                        const apptEnd = this.parseDate(record['발령종료일']);

                        if (apptStart && apptEnd) {
                            const months = this.getMonthsDifference(apptStart, apptEnd);
                            totalLeaveMonths += months;
                        }
                    }
                }
            }
        });

        PROMOTION_DEBUG && console.log('휴직 기간 계산:', teacher['성명'], totalLeaveMonths, '개월');
        return totalLeaveMonths;
    }

    /**
     * 두 날짜 사이의 개월 수 계산
     */
    getMonthsDifference(startDate, endDate) {
        const yearDiff = endDate.getFullYear() - startDate.getFullYear();
        const monthDiff = endDate.getMonth() - startDate.getMonth();
        const dayDiff = endDate.getDate() - startDate.getDate();

        let totalMonths = yearDiff * 12 + monthDiff;

        // 일 단위까지 고려 (말일까지 포함)
        if (dayDiff >= 0) {
            totalMonths += 1;
        }

        return totalMonths;
    }

    /**
     * 날짜 파싱 (여러 형식 지원)
     */
    parseDate(dateStr) {
        if (!dateStr) return null;

        const str = dateStr.toString().trim();

        // YYYY.MM.DD 형식
        if (str.match(/^\d{4}\.\d{1,2}\.\d{1,2}$/)) {
            const parts = str.split('.');
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }

        // YYYY-MM-DD 형식
        if (str.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
            const parts = str.split('-');
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }

        // Excel 날짜 (숫자)
        if (typeof dateStr === 'number') {
            return new Date((dateStr - 25569) * 86400 * 1000);
        }

        return null;
    }

    /**
     * 교원의 임용 구분 확인 (2012.2.28 전/후)
     */
    getAppointmentType(teacher) {
        // 비정년트랙 확인
        const rank = teacher['직급'];
        if (rank && rank.includes('비정년')) {
            return 'non_tenure';
        }

        // 정년트랙 임용일 사용 (조교/코치/비정년트랙 경력 제외)
        const firstAppointment = this.getTenureTrackAppointmentDate(teacher);

        if (!firstAppointment) return null;

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
     * 정년트랙 임용일 찾기
     *
     * 발령사항에서 "조교수" 직급의 "최초임용" 발령 중 "비정년트랙"이 아닌 첫 발령일
     *
     * 제외 대상:
     * - 조교, 전임코치 등 조교수 이전 경력
     * - 조교수(비정년트랙) 경력
     */
    getTenureTrackAppointmentDate(teacher) {
        const appointmentHistory = this.getAppointmentHistory(teacher);
        if (!appointmentHistory || !appointmentHistory.appointments) {
            // 발령사항이 없으면 교원현황의 전임교원 최초임용일 사용
            return DateUtils.parseDate(this.getTeacherValue(teacher, '전임교원\n최초임용일'));
        }

        // 발령사항을 날짜순 정렬
        const sortedAppointments = [...appointmentHistory.appointments].sort((a, b) => {
            const dateA = this.parseDate(a['발령시작일'] || a['발령일'] || a['발령일자']) || new Date(0);
            const dateB = this.parseDate(b['발령시작일'] || b['발령일'] || b['발령일자']) || new Date(0);
            return dateA - dateB;
        });

        // "조교수" + "최초임용" + 비정년트랙 아님
        for (const record of sortedAppointments) {
            const appointmentType = (record['발령구분'] || '').toString();
            const rank = (record['발령직급'] || '').toString();

            // 최초임용이고, 조교수이며, 비정년트랙이 아닌 경우
            // 비정년트랙 표기: "조교수(비정년트랙)" 또는 "조교수.(비정년트랙)"
            if (appointmentType.includes('최초임용') &&
                rank.includes('조교수') &&
                !rank.includes('비정년')) {
                const appointmentDate = this.parseDate(record['발령시작일'] || record['발령일'] || record['발령일자']);
                if (appointmentDate) {
                    PROMOTION_DEBUG && console.log('✓ 정년트랙 임용일:', teacher['성명'], DateUtils.formatDate(appointmentDate), '발령직급:', rank);
                    return appointmentDate;
                }
            }
        }

        // 못 찾으면 교원현황의 전임교원 최초임용일 사용 (fallback)
        return DateUtils.parseDate(this.getTeacherValue(teacher, '전임교원\n최초임용일'));
    }

    /**
     * 비정년트랙 임용일 찾기
     *
     * 발령사항에서 "조교수(비정년트랙)" 또는 유사한 비정년트랙 임용 발령일
     */
    getNonTenureAppointmentDate(teacher) {
        const appointmentHistory = this.getAppointmentHistory(teacher);
        if (!appointmentHistory || !appointmentHistory.appointments) {
            // 발령사항이 없으면 교원현황의 전임교원 최초임용일 사용
            return DateUtils.parseDate(this.getTeacherValue(teacher, '전임교원\n최초임용일'));
        }

        // 발령사항을 날짜순 정렬
        const sortedAppointments = [...appointmentHistory.appointments].sort((a, b) => {
            const dateA = this.parseDate(a['발령시작일'] || a['발령일'] || a['발령일자']) || new Date(0);
            const dateB = this.parseDate(b['발령시작일'] || b['발령일'] || b['발령일자']) || new Date(0);
            return dateA - dateB;
        });

        // "조교수(비정년트랙)" 최초임용 발령 찾기
        for (const record of sortedAppointments) {
            const appointmentType = (record['발령구분'] || '').toString();
            const rank = (record['발령직급'] || '').toString();

            // 최초임용이고, 조교수이며, 비정년트랙인 경우
            if (appointmentType.includes('최초임용') &&
                rank.includes('조교수') &&
                rank.includes('비정년')) {
                const appointmentDate = this.parseDate(record['발령시작일'] || record['발령일'] || record['발령일자']);
                if (appointmentDate) {
                    PROMOTION_DEBUG && console.log('✓ 비정년트랙 임용일:', teacher['성명'], DateUtils.formatDate(appointmentDate), '발령직급:', rank);
                    return appointmentDate;
                }
            }
        }

        // 못 찾으면 교원현황의 전임교원 최초임용일 사용 (fallback)
        return DateUtils.parseDate(this.getTeacherValue(teacher, '전임교원\n최초임용일'));
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

        // 기준일 계산 (정년트랙/비정년트랙에 따라 다른 함수 사용)
        let baseDate;
        if (currentRankKey === '부교수') {
            const currentRankDate = DateUtils.parseDate(this.getTeacherValue(teacher, '현직급\n승인일'));
            if (currentRankDate) {
                baseDate = currentRankDate;
            } else if (appointmentType === 'non_tenure') {
                baseDate = this.getNonTenureAppointmentDate(teacher);
            } else {
                baseDate = this.getTenureTrackAppointmentDate(teacher);
            }
        } else {
            // 조교수: 트랙 유형에 따른 임용일 사용
            if (appointmentType === 'non_tenure') {
                baseDate = this.getNonTenureAppointmentDate(teacher);
            } else {
                baseDate = this.getTenureTrackAppointmentDate(teacher);
            }
        }

        if (!baseDate) return null;

        // 승진 자격일 계산 (기준일 + 소요 연한)
        const eligibleDate = new Date(baseDate);
        eligibleDate.setFullYear(eligibleDate.getFullYear() + requirement.years);

        // 교원인사규정 제15조 제1항 - 휴직 기간 처리:
        // "승진소요연한산정시 본인의 원에의한휴직기간 및공무로 인한휴직기간은
        //  다음각호의 승진소요연한에 산입하지아니한다"
        //
        // ※ 중요: 이 규정은 정년트랙 교원에만 적용됨
        //   - 정년트랙: 휴직 기간을 승진일에 가산 (출산휴가, 육아휴직 등)
        //   - 비정년트랙: 임용계약 기반이므로 휴직 기간 미반영
        //     예: 함지선 교수(교육대학원, 비정년트랙) - 출산휴가 반영 불필요

        const leaveMonths = this.calculateLeaveMonths(teacher);

        if (appointmentType !== 'non_tenure') {
            // 정년트랙 교원: 휴직 기간 가산
            if (leaveMonths > 0) {
                eligibleDate.setMonth(eligibleDate.getMonth() + leaveMonths);
                PROMOTION_DEBUG && console.log('✓ 휴직 기간 반영 (정년트랙):', teacher['성명'], leaveMonths, '개월 →', DateUtils.formatDate(eligibleDate));
            }
        } else {
            // 비정년트랙 교원: 휴직 기간 미반영
            if (leaveMonths > 0) {
                PROMOTION_DEBUG && console.log('ℹ 휴직 기간 미반영 (비정년트랙):', teacher['성명'], leaveMonths, '개월 - 임용계약 기반으로 가산 제외');
            }
        }

        return eligibleDate;
    }

    /**
     * 승진일을 4월 1일 또는 10월 1일로 조정
     * 교원인사규정 제16조
     */
    adjustToPromotionDate(eligibleDate) {
        if (!eligibleDate) return null;

        const year = eligibleDate.getFullYear();
        const month = eligibleDate.getMonth(); // 0-based (0 = 1월, 3 = 4월, 9 = 10월)
        const day = eligibleDate.getDate();

        // 정확히 4월 1일이면 그대로 반환
        if (month === 3 && day === 1) {
            return new Date(year, 3, 1);
        }

        // 정확히 10월 1일이면 그대로 반환
        if (month === 9 && day === 1) {
            return new Date(year, 9, 1);
        }

        // 1~3월: 해당년도 4월 1일
        if (month < 3) {
            return new Date(year, 3, 1);
        }

        // 4~9월: 해당년도 10월 1일
        if (month < 9) {
            return new Date(year, 9, 1);
        }

        // 10~12월: 다음년도 4월 1일
        return new Date(year + 1, 3, 1);
    }

    /**
     * 다음 승진일 계산 (당해 연도만)
     *
     * 승진 자격일 이후의 해당 학년도 승진일(4월/10월) 중 기준일 이후의 첫 번째 승진일 반환
     *
     * 예: 자격일 2023.08.15, 기준일 2026.01.14
     * - 자격일 < 2026.04.01 이고 기준일 < 2026.04.01 → 2026.04.01 반환
     * - 과거 탈락 여부는 예외 사항에서 관리 (특정 승진일만 제외)
     *
     * ※ 과거에 탈락했어도 자격일이 해당 승진일보다 이전이면 자동으로 대상자로 표시
     */
    getNextPromotionDate(teacher) {
        const eligibleDate = this.getPromotionEligibleDate(teacher);
        if (!eligibleDate) return null;

        const baseYear = this.baseDate.getFullYear();

        // 해당 학년도의 4월 1일과 10월 1일
        const april1st = new Date(baseYear, 3, 1);
        const october1st = new Date(baseYear, 9, 1);

        // 승진 자격일이 해당 승진일 이전이고, 기준일도 이전이면 대상자
        if (eligibleDate <= april1st && this.baseDate <= april1st) {
            return april1st;
        }

        if (eligibleDate <= october1st && this.baseDate <= october1st) {
            return october1st;
        }

        // 당해 연도에 해당하는 승진일이 없음
        return null;
    }

    /**
     * 예외 사항 불러오기
     */
    getExceptions() {
        const stored = localStorage.getItem(this.EXCEPTIONS_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    /**
     * 예외 사항 저장
     */
    saveExceptions(exceptions) {
        localStorage.setItem(this.EXCEPTIONS_KEY, JSON.stringify(exceptions));
    }

    /**
     * 특정 교원이 예외 사항에 해당하는지 확인
     * @param {Object} teacher - 교원 정보
     * @param {Date} nextPromotionDate - 다음 승진일 (null일 수 있음)
     */
    checkException(teacher, nextPromotionDate) {
        const exceptions = this.getExceptions();
        const teacherName = teacher['성명'];
        const department = teacher['소속'];

        // 이름과 소속이 일치하는 활성화된 예외 사항 찾기
        const matchingExceptions = exceptions.filter(ex =>
            ex.name === teacherName &&
            (!ex.department || ex.department === department) &&
            ex.isActive
        );

        // 일치하는 예외가 없으면 예외 없음
        if (matchingExceptions.length === 0) {
            return { hasException: false };
        }

        // 예외가 있는 경우, 승진일 기준으로 필터링
        for (const exception of matchingExceptions) {
            // promotionDate가 null이면 영구 제외 (모든 승진일에 적용)
            if (!exception.promotionDate) {
                return {
                    hasException: true,
                    type: exception.type,
                    reason: exception.reason,
                    note: exception.note,
                    appliesTo: '영구 제외'
                };
            }

            // promotionDate가 있으면 해당 승진일과 비교
            if (nextPromotionDate) {
                const exceptionDate = new Date(exception.promotionDate);
                // 연도, 월, 일이 모두 일치하는지 확인
                if (exceptionDate.getFullYear() === nextPromotionDate.getFullYear() &&
                    exceptionDate.getMonth() === nextPromotionDate.getMonth() &&
                    exceptionDate.getDate() === nextPromotionDate.getDate()) {
                    return {
                        hasException: true,
                        type: exception.type,
                        reason: exception.reason,
                        note: exception.note,
                        appliesTo: exception.promotionDate
                    };
                }
            }
        }

        // 해당 승진일에는 예외가 적용되지 않음
        return { hasException: false };
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
     * @param {Object} teacher - 교원 정보
     * @param {Date} providedPromotionDate - 다음 승진일 (null일 수 있음)
     */
    isPromotionCandidate(teacher, providedPromotionDate = null) {
        // 1. 직급 확인 (교수는 제외)
        const rank = teacher['직급'];

        // 교수가 아닌 조교수, 부교수만 대상
        if (!rank) {
            PROMOTION_DEBUG && console.log('직급 없음:', teacher['성명']);
            return false;
        }

        // 교수는 더 이상 승진이 없음
        if (rank.includes('교수') && !rank.includes('조교수') && !rank.includes('부교수')) {
            return false;
        }

        // 2. 다음 승진일 계산
        const nextPromotionDate = providedPromotionDate || this.getNextPromotionDate(teacher);
        if (!nextPromotionDate) {
            PROMOTION_DEBUG && console.log('승진일 없음:', teacher['성명'], rank);
            return false;
        }

        // 0. 예외 사항 확인 (최우선, 승진일 계산 후)
        const exception = this.checkException(teacher, nextPromotionDate);
        if (exception.hasException) {
            PROMOTION_DEBUG && console.log('❌ 예외 사항:', teacher['성명'], exception.type, exception.appliesTo, exception.reason);
            return false;
        }

        // 3. 승진 제한 사유 확인
        const restriction = this.checkPromotionRestrictions(teacher);
        if (restriction.isRestricted) {
            return false;
        }

        PROMOTION_DEBUG && console.log('✅ 승진 대상자:', teacher['성명'], rank, '→ 승진일:', this.adjustToPromotionDate(nextPromotionDate));
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
            isCandidate: this.isPromotionCandidate(teacher, nextPromotionDate),
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
        PROMOTION_DEBUG && console.log('=== 승진 대상자 계산 시작 ===');
        PROMOTION_DEBUG && console.log('전체 교원 수:', facultyData.length);

        // 직급별 통계
        const rankStats = {};
        facultyData.forEach(t => {
            const rank = t['직급'] || '직급없음';
            rankStats[rank] = (rankStats[rank] || 0) + 1;
        });
        PROMOTION_DEBUG && console.log('직급별 통계:', rankStats);

        const results = facultyData.map(teacher => ({
            teacher,
            promotionInfo: this.getPromotionInfo(teacher)
        })).filter(item => item.promotionInfo.isCandidate);

        PROMOTION_DEBUG && console.log('최종 승진 대상자 수:', results.length);
        PROMOTION_DEBUG && console.log('=== 승진 대상자 계산 완료 ===');

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
     * 정년트랙/비정년트랙 및 승진 경로별 그룹화
     */
    groupByTrackAndPath(promotionCandidates) {
        const groups = {
            tenure: {
                associateToFull: [],      // 정년트랙: 부교수 -> 교수
                assistantToAssociate: []  // 정년트랙: 조교수 -> 부교수
            },
            nonTenure: {
                assistantToAssociate: []  // 비정년트랙: 조교수 -> 부교수
            }
        };

        promotionCandidates.forEach(candidate => {
            const rank = candidate.teacher['직급'] || '';
            const nextRank = candidate.promotionInfo.requirement?.nextRank || '';

            // 정년트랙 vs 비정년트랙 판별
            const isTenure = !rank.includes('비정년');

            if (isTenure) {
                // 정년트랙
                if (rank.includes('부교수') && nextRank === '교수') {
                    groups.tenure.associateToFull.push(candidate);
                } else if (rank.includes('조교수') && nextRank === '부교수') {
                    groups.tenure.assistantToAssociate.push(candidate);
                }
            } else {
                // 비정년트랙 (조교수 -> 부교수만 가능)
                if (rank.includes('조교수') && nextRank === '부교수') {
                    groups.nonTenure.assistantToAssociate.push(candidate);
                }
            }
        });

        return groups;
    }

    /**
     * 시기 및 트랙별 복합 그룹화
     */
    groupByPeriodAndTrack(promotionCandidates) {
        const periodGroups = this.groupByPromotionPeriod(promotionCandidates);

        return {
            april: this.groupByTrackAndPath(periodGroups.april),
            october: this.groupByTrackAndPath(periodGroups.october)
        };
    }

    /**
     * 통계 계산
     */
    calculateStatistics(promotionCandidates) {
        const groups = this.groupByPromotionPeriod(promotionCandidates);
        const groupsByTrack = this.groupByPeriodAndTrack(promotionCandidates);
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
            groupsByTrack,  // 트랙별 그룹 추가
            urgentCandidates,
            restrictedCandidates
        };
    }
}

// 전역 객체로 내보내기
window.PromotionEngine = PromotionEngine;
