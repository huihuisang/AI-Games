class BombGame {
  constructor() {
    this.round = 0;
    this.pick_count = 0;
    this.score = 0;
    this.bombIndex = -1;
    this.busy = false;
    this.roundScores = [];
  }

  start() {
    this.round = 1;
    this.roundScores = [];
    this.startRound();
    this.showScreen("game-screen");
  }

  startRound() {
    this.pick_count = 0;
    this.score = 0;
    this.updateUI();
    document.getElementById("history").innerHTML = "";
    document.getElementById("prompt").textContent = "选一个盒子！";
    this.resetBoxes();
    this.placeBomb();
  }

  placeBomb() {
    this.bombIndex = Math.random() < 0.5 ? 0 : 1;
  }

  resetBoxes() {
    document.querySelectorAll(".box").forEach((box) => {
      box.classList.remove("flipped", "bomb", "safe", "shake", "bounce", "disabled");
      box.querySelector(".box-back").textContent = "";
    });
  }

  pick(index) {
    if (this.busy) return;
    this.busy = true;
    this.pick_count++;

    const gotBomb = index === this.bombIndex;
    if (gotBomb) this.score++;

    // Show both boxes
    const pickedBox = document.querySelectorAll(".box")[index];
    const otherBox = document.querySelectorAll(".box")[1 - index];

    // Disable clicking
    document.querySelectorAll(".box").forEach((b) => b.classList.add("disabled"));

    // Flip the picked box
    pickedBox.classList.add("flipped");
    pickedBox.classList.add(gotBomb ? "bomb" : "safe");
    const pickedBack = document.getElementById(`box-back-${index}`);
    pickedBack.textContent = gotBomb ? "💣" : "✨";

    // After a short delay, also reveal the other box
    setTimeout(() => {
      otherBox.classList.add("flipped");
      otherBox.classList.add(gotBomb ? "safe" : "bomb");
      const otherBack = document.getElementById(`box-back-${1 - index}`);
      otherBack.textContent = gotBomb ? "✨" : "💣";

      // Animate
      if (gotBomb) {
        pickedBox.classList.add("shake");
        document.getElementById("prompt").textContent = "💥 踩到炸弹！+1 分";
      } else {
        pickedBox.classList.add("bounce");
        document.getElementById("prompt").textContent = "✨ 安全！没有炸弹";
      }

      // Add history dot
      this.addHistoryDot(gotBomb);
      this.updateUI();

      // Next pick or end round
      setTimeout(() => {
        if (this.pick_count >= 10) {
          this.endRound();
        } else {
          this.resetBoxes();
          this.placeBomb();
          document.getElementById("prompt").textContent = "选一个盒子！";
          this.busy = false;
        }
      }, 1200);
    }, 500);
  }

  addHistoryDot(isBomb) {
    const dot = document.createElement("div");
    dot.className = `history-dot ${isBomb ? "bomb" : "safe"}`;
    dot.textContent = isBomb ? "💣" : "✨";
    document.getElementById("history").appendChild(dot);
  }

  updateUI() {
    document.getElementById("round-num").textContent = this.round;
    document.getElementById("pick-num").textContent = Math.min(this.pick_count + 1, 10);
    document.getElementById("score").textContent = this.score;
  }

  endRound() {
    this.roundScores.push(this.score);

    if (this.score > 5) {
      // Continue to next round
      document.getElementById("prompt").textContent =
        `🔥 本轮 ${this.score} 分！超过 5 分，进入下一轮！`;
      setTimeout(() => {
        this.round++;
        this.startRound();
        this.busy = false;
      }, 2000);
    } else {
      // Game over
      setTimeout(() => {
        this.showResult();
      }, 1000);
    }
  }

  showResult() {
    const totalRounds = this.roundScores.length;
    const totalScore = this.roundScores.reduce((a, b) => a + b, 0);

    let icon, title;
    if (totalRounds >= 5) {
      icon = "🏆";
      title = "炸弹大师！";
    } else if (totalRounds >= 3) {
      icon = "🔥";
      title = "运气不错！";
    } else if (totalRounds >= 2) {
      icon = "👍";
      title = "还行吧！";
    } else {
      icon = "😅";
      title = "运气一般...";
    }

    document.getElementById("result-icon").textContent = icon;
    document.getElementById("result-title").textContent = title;

    let detail = `<div class="round-line">共闯过 <span>${totalRounds}</span> 轮，总计 <span>${totalScore}</span> 分</div>`;
    this.roundScores.forEach((s, i) => {
      const status = s > 5 ? "✅ 过关" : "❌ 停止";
      detail += `<div class="round-line">第 ${i + 1} 轮: <span>${s}</span> 分 ${status}</div>`;
    });
    document.getElementById("result-detail").innerHTML = detail;

    this.showScreen("result-screen");
  }

  restart() {
    this.showScreen("start-screen");
  }

  showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
    const screen = document.getElementById(id);
    screen.classList.remove("hidden");
    // Re-trigger animation
    screen.style.animation = "none";
    screen.offsetHeight; // force reflow
    screen.style.animation = "";
    this.busy = false;
  }
}

const game = new BombGame();
