/**
 * 네비게이션 바 스크립트
 */

class Navigation {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    init() {
        this.setActiveLink();
        this.setupMobileToggle();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.substring(path.lastIndexOf('/') + 1);

        // 기본 페이지 매핑
        if (page === '' || page === 'index.html') return 'dashboard';
        if (page === 'promotion.html') return 'promotion';
        if (page === 'promotion-process.html') return 'promotion';
        if (page === 'reappointment.html') return 'reappointment';
        if (page === 'regulations.html') return 'regulations';
        if (page === 'settings.html') return 'settings';

        return 'dashboard';
    }

    setActiveLink() {
        // 모든 네비게이션 링크에서 active 클래스 제거
        document.querySelectorAll('.navbar-link').forEach(link => {
            link.classList.remove('active');
        });

        // 현재 페이지에 해당하는 링크에 active 클래스 추가
        const activeLink = document.querySelector(`[data-page="${this.currentPage}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    setupMobileToggle() {
        const toggle = document.querySelector('.navbar-toggle');
        const menu = document.querySelector('.navbar-menu');

        if (toggle && menu) {
            toggle.addEventListener('click', () => {
                toggle.classList.toggle('active');
                menu.classList.toggle('active');
            });

            // 메뉴 항목 클릭 시 모바일 메뉴 닫기
            document.querySelectorAll('.navbar-link').forEach(link => {
                link.addEventListener('click', () => {
                    toggle.classList.remove('active');
                    menu.classList.remove('active');
                });
            });

            // 외부 클릭 시 메뉴 닫기
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.navbar')) {
                    toggle.classList.remove('active');
                    menu.classList.remove('active');
                }
            });
        }
    }
}

// 페이지 로드 시 네비게이션 초기화
document.addEventListener('DOMContentLoaded', () => {
    new Navigation();
});
