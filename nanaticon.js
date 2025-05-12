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
    