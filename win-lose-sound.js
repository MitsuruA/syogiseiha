/* ========================================
  ui.js - 勝敗演出（B担当用）
  - 勝利 / 敗北時に音楽再生
  - 画面中央にメッセージ表示
======================================== */

// 勝利用サウンド
const winSound = new Audio('./assets/audio/sfx/win.mp3');
// 敗北用サウンド（替え歌元音源）
const loseSound = new Audio('./assets/audio/sfx/lose.mp3');

// メッセージ表示用div
const messageDiv = document.createElement('div');
messageDiv.style.position = 'fixed';
messageDiv.style.top = '50%';
messageDiv.style.left = '50%';
messageDiv.style.transform = 'translate(-50%, -50%)';
messageDiv.style.padding = '20px 40px';
messageDiv.style.background = 'rgba(0,0,0,0.8)';
messageDiv.style.color = '#fff';
messageDiv.style.fontSize = '24px';
messageDiv.style.borderRadius = '10px';
messageDiv.style.textAlign = 'center';
messageDiv.style.zIndex = '9999';
messageDiv.style.display = 'none';
document.body.appendChild(messageDiv);

// 勝利演出
function showWinMessage(prefName) {
  messageDiv.innerText = `勝利！${prefName}の武将を倒した！🎉`;
  messageDiv.style.background = 'rgba(31,111,235,0.9)'; // 青系
  messageDiv.style.display = 'block';

  // 音を再生
  winSound.currentTime = 0;
  winSound.play();

  // 3秒後に自動非表示
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
}

// 敗北演出
function showLoseMessage(prefName) {
  messageDiv.innerText = `敗北…${prefName}の武将に負けた…💦
ちろり～ん、鼻から牛乳～`;
  messageDiv.style.background = 'rgba(235,31,31,0.9)'; // 赤系
  messageDiv.style.display = 'block';

  // 音を再生
  loseSound.currentTime = 0;
  loseSound.play();

  // 3秒後に自動非表示
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
}

/* 使い方例
  勝利時: showWinMessage('徳川家康')
  敗北時: showLoseMessage('徳川家康')
*/
