// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', () => {
    // 이모지와 특수문자 클릭 이벤트 리스너 추가
    document.querySelectorAll('.emoji, .special').forEach(element => {
        element.addEventListener('click', async () => {
            const text = element.textContent.trim();
            try {
                await copyToClipboard(text);
                showToast(text);
            } catch (err) {
                alert('복사 기능이 지원되지 않는 브라우저입니다.');
                console.error('복사 실패:', err);
            }
        });
    });

    const menu = document.querySelector('.menu');

    function checkScrollState() {
        const isScrollable = menu.scrollWidth > menu.clientWidth;
        const isAtEnd = Math.abs((menu.scrollLeft + menu.clientWidth) - menu.scrollWidth) < 1;

        // 스크롤이 필요없거나 끝에 도달했을 때 화살표 숨김
        if (!isScrollable || isAtEnd) {
            menu.classList.add('hide-arrow');
        } else {
            menu.classList.remove('hide-arrow');
        }
    }

    // 스크롤 이벤트 리스너
    menu.addEventListener('scroll', checkScrollState);

    // 리사이즈 이벤트 리스너
    window.addEventListener('resize', checkScrollState);

    // 초기 상태 체크
    checkScrollState();
});

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        throw new Error('클립보드 복사에 실패했습니다.');
    }
}

function showToast(emoji) {
    const toast = document.getElementById('toast');
    toast.innerHTML = `${emoji}<br>복사됐어요`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}
    