/**
 * 공통 유틸리티 함수
 */

// ===== 날짜 유틸리티 =====
const DateUtils = {
    /**
     * 날짜 문자열을 파싱 (타임존 이슈 해결)
     */
    parseDate(dateStr) {
        if (!dateStr) return null;
        const cleanStr = dateStr.toString().replace(/[^\d.]/g, '');
        const parts = cleanStr.split('.');
        if (parts.length === 3) {
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return null;
    },

    /**
     * 날짜 포맷팅 (YYYY.MM.DD)
     */
    formatDate(date) {
        if (!date) return '-';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    },

    /**
     * Input용 날짜 형식 (YYYY-MM-DD)
     */
    formatDateForInput(date) {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * 날짜가 같은지 비교
     */
    isSameDate(date1, date2) {
        if (!date1 || !date2) return false;
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    },

    /**
     * 날짜 차이 계산 (일 단위)
     */
    getDaysUntil(targetDate, baseDate = new Date()) {
        if (!targetDate) return null;
        const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
        const diffTime = target - base;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    /**
     * 날짜 차이 계산 (개월 단위)
     */
    getMonthsUntil(targetDate, baseDate = new Date()) {
        if (!targetDate) return null;
        const diffMonths = (targetDate.getFullYear() - baseDate.getFullYear()) * 12 +
                         (targetDate.getMonth() - baseDate.getMonth());
        return diffMonths;
    },

    /**
     * 윤년 체크
     */
    isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    }
};

// ===== 로컬 스토리지 유틸리티 =====
const StorageUtils = {
    /**
     * 데이터 저장
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },

    /**
     * 데이터 가져오기
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    },

    /**
     * 데이터 삭제
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    },

    /**
     * 모든 데이터 삭제
     */
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Storage clear error:', e);
            return false;
        }
    }
};

// ===== UI 유틸리티 =====
const UIUtils = {
    /**
     * 로딩 스피너 표시
     */
    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '<div class="text-center p-4"><div class="spinner">로딩 중...</div></div>';
        }
    },

    /**
     * 에러 메시지 표시
     */
    showError(message, elementId = null) {
        if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = `<div class="alert alert-danger">${message}</div>`;
            }
        } else {
            alert(message);
        }
    },

    /**
     * 성공 메시지 표시
     */
    showSuccess(message, elementId = null) {
        if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = `<div class="alert alert-success">${message}</div>`;
            }
        } else {
            alert(message);
        }
    },

    /**
     * 빈 상태 표시
     */
    showEmpty(message, elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<div class="text-center p-4 text-muted">${message}</div>`;
        }
    },

    /**
     * 테이블 생성
     */
    createTable(headers, rows, className = 'table') {
        let html = `<table class="${className}"><thead><tr>`;
        headers.forEach(header => {
            html += `<th>${header}</th>`;
        });
        html += '</tr></thead><tbody>';
        rows.forEach(row => {
            html += '<tr>';
            row.forEach(cell => {
                html += `<td>${cell}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        return html;
    }
};

// ===== 파일 유틸리티 =====
const FileUtils = {
    /**
     * 파일 읽기
     */
    readFile(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => callback(e.target.result);
        reader.onerror = (e) => console.error('File read error:', e);
        reader.readAsArrayBuffer(file);
    },

    /**
     * 파일 확장자 확인
     */
    getExtension(filename) {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    },

    /**
     * 파일 다운로드
     */
    download(content, filename, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

// ===== 데이터 검증 유틸리티 =====
const ValidationUtils = {
    /**
     * 빈 값 체크
     */
    isEmpty(value) {
        return value === null || value === undefined || value === '';
    },

    /**
     * 이메일 검증
     */
    isEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * 날짜 검증
     */
    isValidDate(date) {
        return date instanceof Date && !isNaN(date);
    }
};

// ===== 네비게이션 유틸리티 =====
const NavUtils = {
    /**
     * 현재 페이지에 맞는 네비게이션 링크 활성화
     */
    initActiveLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.navbar-link');

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage ||
                (currentPage === '' && href === 'index.html') ||
                (currentPage === 'index.html' && href === 'index.html')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    },

    /**
     * 모바일 메뉴 토글 초기화
     */
    initMobileMenu() {
        const toggle = document.querySelector('.navbar-toggle');
        const menu = document.querySelector('.navbar-menu');

        if (toggle && menu) {
            toggle.addEventListener('click', () => {
                toggle.classList.toggle('active');
                menu.classList.toggle('active');
            });
        }
    }
};

// ===== 페이지 로드 시 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
    NavUtils.initActiveLink();
    NavUtils.initMobileMenu();
});

// ===== 전역 객체로 내보내기 =====
window.DateUtils = DateUtils;
window.StorageUtils = StorageUtils;
window.UIUtils = UIUtils;
window.FileUtils = FileUtils;
window.ValidationUtils = ValidationUtils;
window.NavUtils = NavUtils;
