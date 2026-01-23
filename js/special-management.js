/**
 * 특별 관리 대상 공용 모듈
 * 승진/재임용 페이지에서 공유
 */

const SpecialManagement = {
    STORAGE_KEY: 'specialManagementRecords',

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

    // 발령사항 데이터 가져오기 (교원별)
    getAppointmentData(name, department) {
        const allData = StorageUtils.get('appointmentData') || {};
        const key = `${name}_${department}`;
        return allData[key]?.appointments || [];
    },

    // 교원현황에서 현재 재직 상태 확인
    getFacultyStatus(name, department) {
        const facultyData = StorageUtils.get('facultyData') || [];
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
    buildTableData(name, department, baseDate = new Date()) {
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
        let lastReappointmentDate = null;
        let promotionWorkingDays = 0;
        let reappointmentWorkingDays = 0;

        sorted.forEach((appt, index) => {
            const startDate = appt['발령시작일'] || appt['발령일'];
            const endDate = appt['발령종료일'];
            const type = appt['발령구분'] || '';
            const category = this.getAppointmentCategory(type);

            // 기간 계산
            let duration = '-';
            if (startDate && endDate && category !== 'return') {
                duration = this.calculateDuration(startDate, endDate);
            }

            // 승진 카운트다운 (휴직 제외, 병가 포함)
            let promotionCountdown = '-';
            if (category !== 'return' && category !== 'sick') {
                if (category === 'leave') {
                    promotionCountdown = '-'; // 휴직은 카운트하지 않음
                } else if (startDate && endDate) {
                    const start = this.parseDate(startDate);
                    const end = this.parseDate(endDate);
                    if (start && end) {
                        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                        promotionWorkingDays += days;
                        promotionCountdown = this.daysToText(promotionWorkingDays);
                    }
                }
            }

            // 재임용 카운트다운
            let reappointmentCountdown = '-';
            if (category === 'reappointment') {
                lastReappointmentDate = this.parseDate(startDate);
                reappointmentWorkingDays = 0;
            }

            if (lastReappointmentDate && category !== 'return') {
                if (category === 'leave') {
                    reappointmentCountdown = '-';
                } else if (category !== 'sick' && startDate && endDate) {
                    const start = this.parseDate(startDate);
                    const end = this.parseDate(endDate);
                    if (start && end && start >= lastReappointmentDate) {
                        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                        reappointmentWorkingDays += days;
                        reappointmentCountdown = this.daysToText(reappointmentWorkingDays);
                    }
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

            // 마지막 발령이 복직이면 복직일부터, 아니면 마지막 발령 종료일 다음날부터
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

                rows.push({
                    startDate: this.formatDate(currentStartDate),
                    endDate: this.formatDate(baseDate),
                    type: '재직',
                    category: 'working',
                    duration: this.daysToText(days),
                    promotionCountdown: this.daysToText(promotionWorkingDays),
                    reappointmentCountdown: lastReappointmentDate ? this.daysToText(reappointmentWorkingDays) : '-',
                    isCurrent: true
                });
            }
        }

        return {
            rows: rows,
            summary: {
                totalPromotionDays: promotionWorkingDays,
                totalPromotionText: this.daysToText(promotionWorkingDays),
                totalReappointmentDays: reappointmentWorkingDays,
                totalReappointmentText: this.daysToText(reappointmentWorkingDays)
            }
        };
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
