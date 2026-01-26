/**
 * 특별 관리 대상 공용 모듈
 * 승진/재임용 페이지에서 공유
 */

const SpecialManagement = {
    STORAGE_KEY: 'specialManagementRecords',

    // 캐시 (성능 최적화)
    _cache: {
        appointmentData: null,
        facultyData: null,
        lastUpdate: 0
    },

    // 캐시 초기화 (데이터 변경 시 호출)
    clearCache() {
        this._cache.appointmentData = null;
        this._cache.facultyData = null;
        this._cache.lastUpdate = 0;
    },

    // 캐시된 발령사항 데이터 가져오기
    _getCachedAppointmentData() {
        if (!this._cache.appointmentData) {
            this._cache.appointmentData = StorageUtils.get('appointmentData') || {};
        }
        return this._cache.appointmentData;
    },

    // 캐시된 교원현황 데이터 가져오기
    _getCachedFacultyData() {
        if (!this._cache.facultyData) {
            this._cache.facultyData = StorageUtils.get('facultyData') || [];
        }
        return this._cache.facultyData;
    },

    // 특별 관리 대상 목록 가져오기
    getRecords() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    // 특별 관리 대상 목록 저장
    saveRecords(records) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
    },

    // 특별 관리 대상 추가
    addRecord(record) {
        const records = this.getRecords();
        record.id = Date.now().toString();
        record.addedDate = new Date().toISOString();
        records.push(record);
        this.saveRecords(records);
        return record;
    },

    // 특별 관리 대상 수정
    updateRecord(id, updatedData) {
        const records = this.getRecords();
        const index = records.findIndex(r => r.id === id);
        if (index !== -1) {
            records[index] = { ...records[index], ...updatedData };
            this.saveRecords(records);
            return true;
        }
        return false;
    },

    // 특별 관리 대상 삭제
    deleteRecord(id) {
        const records = this.getRecords();
        const filtered = records.filter(r => r.id !== id);
        this.saveRecords(filtered);
    },

    // 유형별 필터
    getRecordsByType(type) {
        const records = this.getRecords();
        return records.filter(r => r.type === type);
    },

    // 발령사항 데이터 가져오기 (교원별) - 캐시 사용
    getAppointmentData(name, department) {
        const allData = this._getCachedAppointmentData();
        const key = `${name}_${department}`;
        return allData[key]?.appointments || [];
    },

    // 교원현황에서 현재 재직 상태 확인 - 캐시 사용
    getFacultyStatus(name, department) {
        const facultyData = this._getCachedFacultyData();
        return facultyData.find(f =>
            f['성명'] === name &&
            (f['소속'] === department || f['소속']?.includes(department))
        );
    },

    // 기간 계산 (년 월 일 형식)
    calculateDuration(startDate, endDate) {
        if (!startDate || !endDate) return '-';

        const start = this.parseDate(startDate);
        const end = this.parseDate(endDate);

        if (!start || !end) return '-';

        const startDay = start.getDate();
        const endDay = end.getDate();
        const lastDayOfEndMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();

        // 시작일이 1일이고 종료일이 월말인 경우 (임용 기간 등)
        // 예: 2021.09.01 ~ 2024.08.31 = 정확히 3년 (36개월)
        if (startDay === 1 && endDay === lastDayOfEndMonth) {
            const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 +
                               (end.getMonth() - start.getMonth()) + 1;
            const years = Math.floor(totalMonths / 12);
            const months = totalMonths % 12;

            const parts = [];
            if (years > 0) parts.push(`${years}년`);
            if (months > 0) parts.push(`${months}개월`);

            if (parts.length === 0) return '-';
            return `${parts.join(' ')} (${totalMonths}개월)`;
        }

        // 일반적인 경우 (일 단위 계산)
        let years = end.getFullYear() - start.getFullYear();
        let months = end.getMonth() - start.getMonth();
        let days = end.getDate() - start.getDate() + 1; // 포함

        if (days < 0) {
            months--;
            const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
            days += prevMonth.getDate();
        }

        if (months < 0) {
            years--;
            months += 12;
        }

        const parts = [];
        if (years > 0) parts.push(`${years}년`);
        if (months > 0) parts.push(`${months}개월`);
        if (days > 0 && years === 0) parts.push(`${days}일`);

        // 총 개월수도 표시
        const totalMonths = years * 12 + months;
        if (totalMonths > 0) {
            return `${parts.join(' ')} (${totalMonths}개월)`;
        }

        return parts.join(' ') || '-';
    },

    // 날짜 파싱
    parseDate(dateStr) {
        if (!dateStr) return null;
        if (dateStr instanceof Date) return dateStr;

        const cleanStr = dateStr.toString().replace(/[^\d./-]/g, '');

        // YYYY.MM.DD 또는 YYYY-MM-DD 또는 YYYY/MM/DD
        let parts;
        if (cleanStr.includes('.')) {
            parts = cleanStr.split('.');
        } else if (cleanStr.includes('-')) {
            parts = cleanStr.split('-');
        } else if (cleanStr.includes('/')) {
            parts = cleanStr.split('/');
        } else {
            return null;
        }

        if (parts.length >= 3) {
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return null;
    },

    // 날짜 포맷팅
    formatDate(date) {
        if (!date) return '-';
        if (typeof date === 'string') {
            date = this.parseDate(date);
        }
        if (!date) return '-';

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    },

    // 발령 유형 판별
    getAppointmentCategory(type) {
        if (!type) return 'other';
        const typeStr = type.toString();

        if (typeStr.includes('최초임용')) return 'initial';
        if (typeStr.includes('재임용')) return 'reappointment';
        if (typeStr.includes('승진')) return 'promotion';
        if (typeStr.includes('휴직')) return 'leave';
        if (typeStr.includes('복직')) return 'return';
        if (typeStr.includes('병가')) return 'sick';
        if (typeStr.includes('재직')) return 'working';

        return 'other';
    },

    // 근무 기간 누적 계산 (휴직 제외, 병가 포함)
    calculateWorkingPeriod(appointments, startFromDate, endAtDate, excludeLeave = true) {
        if (!appointments || appointments.length === 0) return { days: 0, text: '-' };

        const startFrom = startFromDate ? this.parseDate(startFromDate) : null;
        const endAt = endAtDate ? this.parseDate(endAtDate) : new Date();

        let totalDays = 0;

        // 발령사항을 날짜순 정렬
        const sorted = [...appointments].sort((a, b) => {
            const dateA = this.parseDate(a['발령시작일'] || a['발령일']);
            const dateB = this.parseDate(b['발령시작일'] || b['발령일']);
            return (dateA || 0) - (dateB || 0);
        });

        sorted.forEach(appt => {
            const apptStart = this.parseDate(appt['발령시작일'] || appt['발령일']);
            const apptEnd = this.parseDate(appt['발령종료일']) || endAt;
            const category = this.getAppointmentCategory(appt['발령구분']);

            if (!apptStart) return;

            // 시작일 이후의 발령만 계산
            if (startFrom && apptStart < startFrom) return;

            // 종료일 이전의 발령만 계산
            if (apptEnd > endAt) return;

            // 휴직은 제외 (병가는 포함)
            if (excludeLeave && category === 'leave') return;

            // 복직은 기간이 없으므로 스킵
            if (category === 'return') return;

            // 기간 계산
            const days = Math.ceil((apptEnd - apptStart) / (1000 * 60 * 60 * 24)) + 1;
            totalDays += days;
        });

        return {
            days: totalDays,
            text: this.daysToText(totalDays)
        };
    },

    // 일수를 년월일 텍스트로 변환
    daysToText(totalDays) {
        if (totalDays <= 0) return '-';

        const years = Math.floor(totalDays / 365);
        const remainingDays = totalDays % 365;
        const months = Math.floor(remainingDays / 30);
        const days = remainingDays % 30;

        const parts = [];
        if (years > 0) parts.push(`${years}년`);
        if (months > 0) parts.push(`${months}개월`);
        if (days > 0) parts.push(`${days}일`);

        return parts.join(' ') || '-';
    },

    // 재임용 이후 근무 기간 계산
    calculateReappointmentCountdown(appointments, reappointmentDate, currentDate) {
        if (!reappointmentDate) return '-';

        const reapptDate = this.parseDate(reappointmentDate);
        const current = currentDate ? this.parseDate(currentDate) : new Date();

        // 재임용일 이후의 발령사항만 필터
        const relevantAppts = appointments.filter(appt => {
            const apptDate = this.parseDate(appt['발령시작일'] || appt['발령일']);
            return apptDate && apptDate >= reapptDate;
        });

        // 휴직 기간 계산
        let leaveDays = 0;
        relevantAppts.forEach(appt => {
            const category = this.getAppointmentCategory(appt['발령구분']);
            if (category === 'leave') {
                const start = this.parseDate(appt['발령시작일'] || appt['발령일']);
                const end = this.parseDate(appt['발령종료일']) || current;
                if (start && end) {
                    leaveDays += Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                }
            }
        });

        // 전체 기간 - 휴직 기간 = 실제 근무 기간
        const totalDays = Math.ceil((current - reapptDate) / (1000 * 60 * 60 * 24)) + 1;
        const workingDays = totalDays - leaveDays;

        return this.daysToText(workingDays);
    },

    // 테이블 데이터 생성
    // expectedInfo: { startDate, endDate, type: 'promotion' | 'reappointment' }
    buildTableData(name, department, baseDate = new Date(), expectedInfo = null) {
        const appointments = this.getAppointmentData(name, department);
        const faculty = this.getFacultyStatus(name, department);

        if (appointments.length === 0) {
            return { rows: [], summary: null };
        }

        // 발령사항 정렬 (날짜순)
        const sorted = [...appointments].sort((a, b) => {
            const dateA = this.parseDate(a['발령시작일'] || a['발령일']);
            const dateB = this.parseDate(b['발령시작일'] || b['발령일']);
            return (dateA || 0) - (dateB || 0);
        });

        const rows = [];
        let initialAppointmentDate = null;  // 최초 임용일
        let lastReappointmentDate = null;   // 마지막 재임용일
        let lastReappointmentEndDate = null; // 마지막 재임용 종료일
        let promotionWorkingDays = 0;
        let reappointmentWorkingDays = 0;
        let totalLeaveDays = 0;             // 총 휴직 일수
        let leavePeriodsForPromotion = [];  // 승진용 휴직 기록
        let leavePeriodsForReappointment = []; // 재임용용 휴직 기록
        let currentRank = faculty ? faculty['직급'] : '조교수';

        // 1단계: 모든 발령사항 처리하며 휴직 기간 수집
        sorted.forEach((appt, index) => {
            const startDate = appt['발령시작일'] || appt['발령일'];
            const endDate = appt['발령종료일'];
            const type = appt['발령구분'] || '';
            const category = this.getAppointmentCategory(type);

            const start = this.parseDate(startDate);
            const end = this.parseDate(endDate);

            // 최초 임용일 찾기
            if (category === 'initial' && !initialAppointmentDate) {
                initialAppointmentDate = start;
            }

            // 재임용일 찾기
            if (category === 'reappointment') {
                lastReappointmentDate = start;
                lastReappointmentEndDate = end;
                reappointmentWorkingDays = 0;
                leavePeriodsForReappointment = [];
            }

            // 휴직 기간 기록
            if (category === 'leave' && start && end) {
                const leaveDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                totalLeaveDays += leaveDays;

                const leaveInfo = {
                    type: type,
                    days: leaveDays,
                    text: this.daysToText(leaveDays)
                };

                leavePeriodsForPromotion.push(leaveInfo);
                if (lastReappointmentDate) {
                    leavePeriodsForReappointment.push(leaveInfo);
                }
            }

            // 기간 계산
            let duration = '-';
            if (startDate && endDate && category !== 'return') {
                duration = this.calculateDuration(startDate, endDate);
            }

            // 승진 카운트다운 (휴직 제외, 병가 포함)
            let promotionCountdown = '-';
            if (category !== 'return' && category !== 'sick') {
                if (category === 'leave') {
                    promotionCountdown = '-';
                } else if (start && end) {
                    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                    promotionWorkingDays += days;
                    promotionCountdown = this.daysToText(promotionWorkingDays);
                }
            }

            // 재임용 카운트다운
            let reappointmentCountdown = '-';
            if (lastReappointmentDate && category !== 'return') {
                if (category === 'leave') {
                    reappointmentCountdown = '-';
                } else if (category !== 'sick' && start && end && start >= lastReappointmentDate) {
                    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                    reappointmentWorkingDays += days;
                    reappointmentCountdown = this.daysToText(reappointmentWorkingDays);
                }
            }

            // 병가 처리
            if (category === 'sick') {
                duration = '병가는 재직 기간에 영향을 미치지 않음';
                promotionCountdown = '-';
                reappointmentCountdown = '-';
            }

            rows.push({
                startDate: this.formatDate(startDate),
                endDate: this.formatDate(endDate),
                type: type,
                category: category,
                duration: duration,
                promotionCountdown: promotionCountdown,
                reappointmentCountdown: reappointmentCountdown
            });
        });

        // 현재 재직 상태 추가 (마지막 행)
        if (faculty && faculty['재직구분']?.includes('재직')) {
            const lastAppt = sorted[sorted.length - 1];
            const lastEndDate = lastAppt ? this.parseDate(lastAppt['발령종료일']) : null;
            const lastCategory = lastAppt ? this.getAppointmentCategory(lastAppt['발령구분']) : null;

            let currentStartDate;
            if (lastCategory === 'return') {
                currentStartDate = this.parseDate(lastAppt['발령시작일'] || lastAppt['발령일']);
            } else if (lastEndDate) {
                currentStartDate = new Date(lastEndDate);
                currentStartDate.setDate(currentStartDate.getDate() + 1);
            }

            if (currentStartDate) {
                const days = Math.ceil((baseDate - currentStartDate) / (1000 * 60 * 60 * 24)) + 1;
                promotionWorkingDays += days;
                if (lastReappointmentDate) {
                    reappointmentWorkingDays += days;
                }

                // 상세 승진 카운트다운 생성
                const promotionDetail = this._buildPromotionCountdownDetail(
                    initialAppointmentDate,
                    promotionWorkingDays,
                    leavePeriodsForPromotion,
                    currentRank,
                    baseDate
                );

                // 상세 재임용 카운트다운 생성
                const reappointmentDetail = lastReappointmentDate ?
                    this._buildReappointmentCountdownDetail(
                        lastReappointmentDate,
                        lastReappointmentEndDate,
                        reappointmentWorkingDays,
                        leavePeriodsForReappointment,
                        baseDate
                    ) : '-';

                rows.push({
                    startDate: this.formatDate(currentStartDate),
                    endDate: this.formatDate(baseDate),
                    type: '재직',
                    category: 'working',
                    duration: this.daysToText(days),
                    promotionCountdown: promotionDetail,
                    reappointmentCountdown: reappointmentDetail,
                    isCurrent: true
                });
            }
        }

        // 예정 행 추가
        if (expectedInfo && expectedInfo.startDate) {
            const expStartDate = this.parseDate(expectedInfo.startDate);
            let expEndDate = expectedInfo.endDate ? this.parseDate(expectedInfo.endDate) : null;

            if (expStartDate && !expEndDate) {
                expEndDate = new Date(expStartDate);
                if (expectedInfo.type === 'promotion') {
                    expEndDate.setFullYear(expEndDate.getFullYear() + 6);
                } else {
                    expEndDate.setFullYear(expEndDate.getFullYear() + 3);
                }
                expEndDate.setDate(expEndDate.getDate() - 1);
            }

            const expType = expectedInfo.type === 'promotion' ? '승진 예정' : '재임용 예정';
            const expDuration = expStartDate && expEndDate ? this.calculateDuration(expStartDate, expEndDate) : '-';

            let expPromotionDays = promotionWorkingDays;
            let expReappointmentDays = reappointmentWorkingDays;

            if (expStartDate && expEndDate) {
                const expPeriodDays = Math.ceil((expEndDate - expStartDate) / (1000 * 60 * 60 * 24)) + 1;
                expPromotionDays += expPeriodDays;
                if (lastReappointmentDate || expectedInfo.type === 'reappointment') {
                    expReappointmentDays += expPeriodDays;
                }
            }

            rows.push({
                startDate: this.formatDate(expStartDate),
                endDate: this.formatDate(expEndDate),
                type: expType,
                category: 'expected',
                duration: expDuration,
                promotionCountdown: this.daysToText(expPromotionDays),
                reappointmentCountdown: this.daysToText(expReappointmentDays),
                isExpected: true
            });
        }

        return {
            rows: rows,
            summary: {
                totalPromotionDays: promotionWorkingDays,
                totalPromotionText: this.daysToText(promotionWorkingDays),
                totalReappointmentDays: reappointmentWorkingDays,
                totalReappointmentText: this.daysToText(reappointmentWorkingDays),
                totalLeaveDays: totalLeaveDays
            }
        };
    },

    // 승진 카운트다운 상세 정보 생성
    _buildPromotionCountdownDetail(initialDate, workingDays, leavePeriods, currentRank, baseDate) {
        if (!initialDate) {
            return this.daysToText(workingDays);
        }

        const promotionYears = currentRank === '조교수' ? 6 : 8;
        const nextRank = currentRank === '조교수' ? '부교수' : '교수';
        const requiredDays = promotionYears * 365;

        // 원래 승진 예정일 (휴직 없었을 경우)
        const originalPromotionDate = new Date(initialDate);
        originalPromotionDate.setFullYear(originalPromotionDate.getFullYear() + promotionYears);

        // 총 휴직 일수
        const totalLeaveDays = leavePeriods.reduce((sum, p) => sum + p.days, 0);

        // 조정된 승진 예정일
        const adjustedPromotionDate = new Date(originalPromotionDate);
        adjustedPromotionDate.setDate(adjustedPromotionDate.getDate() + totalLeaveDays);

        // 남은 일수
        const remainingDays = requiredDays - workingDays;
        const workingText = this.daysToText(workingDays);

        if (remainingDays <= 0) {
            return `${workingText} (${nextRank} 승진 요건 충족)`;
        }

        let detail = `${workingText}`;

        if (totalLeaveDays > 0 && leavePeriods.length > 0) {
            const leaveList = leavePeriods.map(p => `${p.type} ${p.text}`).join(', ');
            detail += `\n[${nextRank} 승진] 원래 ${this.formatDate(originalPromotionDate)} 예정 → 휴직(${leaveList})으로 ${this.formatDate(adjustedPromotionDate)}로 연기`;
        } else {
            detail += `\n[${nextRank} 승진 예정: ${this.formatDate(adjustedPromotionDate)}]`;
        }

        return detail;
    },

    // 재임용 카운트다운 상세 정보 생성
    _buildReappointmentCountdownDetail(reappointmentDate, contractEndDate, workingDays, leavePeriods, baseDate) {
        if (!reappointmentDate || !contractEndDate) {
            return this.daysToText(workingDays);
        }

        const workingText = this.daysToText(workingDays);
        const totalLeaveDays = leavePeriods.reduce((sum, p) => sum + p.days, 0);

        // 조정된 재임용 만료일
        const adjustedEndDate = new Date(contractEndDate);
        adjustedEndDate.setDate(adjustedEndDate.getDate() + totalLeaveDays);

        let detail = `${workingText}`;

        if (totalLeaveDays > 0 && leavePeriods.length > 0) {
            const leaveList = leavePeriods.map(p => `${p.type} ${p.text}`).join(', ');
            detail += `\n[재임용] 원래 ${this.formatDate(contractEndDate)} 만료 → 휴직(${leaveList})으로 ${this.formatDate(adjustedEndDate)}로 연장`;
        } else {
            detail += `\n[재임용 만료: ${this.formatDate(contractEndDate)}]`;
        }

        return detail;
    },

    // 초기 데이터 마이그레이션 (기존 데이터 변환)
    migrateOldData() {
        const oldData = localStorage.getItem('specialCaseRecords');
        if (!oldData) return;

        const oldRecords = JSON.parse(oldData);
        const newRecords = oldRecords.map(old => ({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: old.name,
            department: old.department,
            type: old.type === 'promotion' ? 'promotion' : 'reappointment',
            expectedDate: old.expectedDate || '',
            conclusion: old.conclusion || '',
            note: old.detail || '',
            addedDate: old.addedDate || new Date().toISOString()
        }));

        this.saveRecords(newRecords);

        // 기존 데이터 백업 후 삭제
        localStorage.setItem('specialCaseRecords_backup', oldData);
        localStorage.removeItem('specialCaseRecords');

        return newRecords;
    }
};

// 전역 객체로 내보내기
window.SpecialManagement = SpecialManagement;
