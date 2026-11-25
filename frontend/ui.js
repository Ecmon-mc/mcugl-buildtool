// 界面层：Minecraft 风格的聊天记录、候选列表、输入框、覆盖层、背景。
//
// 这个模块只负责“画”和“响”，不判断命令语义。补全的逻辑在 commands.js，
// 键盘事件与提交在 app.js。

export const COLORS = {
  black: "#000000",
  dark_blue: "#0000AA",
  dark_green: "#00AA00",
  dark_aqua: "#00AAAA",
  dark_red: "#AA0000",
  dark_purple: "#AA00AA",
  gold: "#FFAA00",
  gray: "#AAAAAA",
  dark_gray: "#555555",
  blue: "#5555FF",
  green: "#55FF55",
  aqua: "#55FFFF",
  red: "#FF5555",
  light_purple: "#FF55FF",
  yellow: "#FFFF55",
  white: "#FFFFFF",
};

const MAX_LINES = 500;

function colorOf(name, fallback = COLORS.white) {
  if (!name) return fallback;
  if (name.startsWith("#")) return name;
  return COLORS[name] || fallback;
}

function normalizeSegment(segment) {
  if (typeof segment === "string") return { text: segment, color: "white" };
  if (Array.isArray(segment)) {
    const [text, color, opts] = segment;
    return { text: text ?? "", color: color || "white", ...(opts || {}) };
  }
  if (segment && typeof segment === "object") return { text: "", color: "white", ...segment };
  return { text: String(segment ?? ""), color: "white" };
}

/** 方块全景背景。全部用 canvas 画，不依赖任何图片文件。 */
class Panorama {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext("2d", { alpha: false });
    this.time = "day";
    this.clouds = [];
    this.stars = [];
    this.last = 0;
    this.frame = 0;
    this.running = false;
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.seedScene();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.seedScene();
    this.draw(0);
  }

  seedScene() {
    // 简化的确定性伪随机，保证每次重绘的山形一致
    let seed = 20261124;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    this.unit = Math.max(8, Math.round(this.w / 150));
    this.clouds = [];
    const count = Math.max(4, Math.round(this.w / 420));
    for (let i = 0; i < count; i += 1) {
      this.clouds.push({
        x: rand() * this.w,
        y: this.h * (0.08 + rand() * 0.3),
        blocks: 3 + Math.floor(rand() * 4),
        speed: 4 + rand() * 8,
      });
    }
    this.stars = [];
    for (let i = 0; i < 110; i += 1) {
      this.stars.push({
        x: rand() * this.w,
        y: rand() * this.h * 0.62,
        size: Math.max(2, Math.round(this.unit / 3)),
        twinkle: rand(),
      });
    }
    this.hillSeed = 7;
  }

  setTime(time) {
    this.time = time;
    this.draw(0);
  }

  palette() {
    switch (this.time) {
      case "noon":
        return {
          skyTop: "#3f8ef0",
          skyBottom: "#cfe7ff",
          sun: "#fffbe0",
          glow: "rgba(255,245,180,0.55)",
          far: "#8fbe72",
          near: "#5b9a45",
          dirt: "#6d4b2c",
          cloud: "#ffffff",
          stars: false,
          vignette: 0.32,
        };
      case "night":
        return {
          skyTop: "#05070f",
          skyBottom: "#16233f",
          sun: "#dfe6ff",
          glow: "rgba(200,215,255,0.25)",
          far: "#22301d",
          near: "#151f11",
          dirt: "#1a130d",
          cloud: "#39456b",
          stars: true,
          vignette: 0.55,
        };
      case "midnight":
        return {
          skyTop: "#020308",
          skyBottom: "#0a1020",
          sun: "#c9d4ff",
          glow: "rgba(180,200,255,0.18)",
          far: "#161f13",
          near: "#0d150b",
          dirt: "#120d09",
          cloud: "#28304d",
          stars: true,
          vignette: 0.62,
        };
      default:
        return {
          skyTop: "#5b9be5",
          skyBottom: "#b9ddff",
          sun: "#fff6c2",
          glow: "rgba(255,240,170,0.4)",
          far: "#82b268",
          near: "#4f8a3f",
          dirt: "#67482c",
          cloud: "#ffffff",
          stars: false,
          vignette: 0.3,
        };
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = (ts) => {
      if (!this.running) return;
      const dt = this.last ? Math.min(64, ts - this.last) : 16;
      this.last = ts;
      this.draw(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    document.addEventListener("visibilitychange", () => {
      this.last = 0;
    });
  }

  stop() {
    this.running = false;
  }

  draw(dt) {
    const { g, w, h, unit } = this;
    const p = this.palette();
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, p.skyTop);
    sky.addColorStop(0.72, p.skyBottom);
    sky.addColorStop(1, p.skyBottom);
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);

    if (p.stars) {
      for (const star of this.stars) {
        const alpha = 0.45 + 0.55 * Math.abs(Math.sin((this.frame + star.twinkle * 90) / 70));
        g.fillStyle = `rgba(235,240,255,${alpha.toFixed(3)})`;
        g.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
      }
    }

    // 太阳 / 月亮都是方块，和游戏里一样
    const sunSize = Math.max(24, Math.round(Math.min(w, h) * 0.075));
    const sunX = Math.round(w * 0.76);
    const sunY = Math.round(h * 0.16);
    g.save();
    g.shadowColor = p.glow;
    g.shadowBlur = sunSize * 1.6;
    g.fillStyle = p.sun;
    g.fillRect(sunX, sunY, sunSize, sunSize);
    g.restore();

    // 云：几块横向堆叠的矩形
    g.fillStyle = p.cloud;
    g.globalAlpha = this.time === "night" || this.time === "midnight" ? 0.5 : 0.82;
    for (const cloud of this.clouds) {
      cloud.x += (cloud.speed * dt) / 1000;
      if (cloud.x > w + unit * 12) cloud.x = -unit * 12;
      for (let i = 0; i < cloud.blocks; i += 1) {
        const bx = Math.round(cloud.x + i * unit * 2.4);
        const by = Math.round(cloud.y + (i % 2) * unit);
        g.fillRect(bx, by, unit * 3, unit);
        g.fillRect(bx + unit, by - unit, unit * 2, unit);
      }
    }
    g.globalAlpha = 1;

    // 两层阶梯状山丘，远山低对比、近山带草皮
    const drawHill = (color, baseY, amplitude, step, offset) => {
      g.fillStyle = color;
      for (let x = -step; x < w + step; x += step) {
        const noise =
          Math.sin((x + offset) / (step * 3.1)) * 0.5 +
          Math.sin((x + offset) / (step * 1.7) + 1.7) * 0.3 +
          Math.sin((x + offset) / (step * 7.3) + 0.4) * 0.2;
        const top = baseY - amplitude * (0.55 + noise * 0.45);
        g.fillRect(x, Math.round(top), step, Math.round(h - top));
      }
    };
    drawHill(p.far, h * 0.74, h * 0.16, unit * 2, 40);
    drawHill(p.dirt, h * 0.9, h * 0.1, unit * 2, 260);
    g.fillStyle = p.near;
    for (let x = -unit * 2; x < w + unit * 2; x += unit * 2) {
      const noise =
        Math.sin((x + 260) / (unit * 6.4)) * 0.5 + Math.sin((x + 260) / (unit * 2.9) + 2.2) * 0.5;
      const top = h * 0.9 - h * 0.1 * (0.55 + noise * 0.45);
      g.fillRect(x, Math.round(top), unit * 2, Math.round(unit * 1.1));
    }

    // 底部压暗，保证聊天文字可读
    const shade = g.createLinearGradient(0, h * 0.35, 0, h);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(0.65, `rgba(0,0,0,${p.vignette * 0.6})`);
    shade.addColorStop(1, `rgba(0,0,0,${p.vignette + 0.25})`);
    g.fillStyle = shade;
    g.fillRect(0, 0, w, h);

    this.frame += 1;
  }
}

/** WebAudio 合成的小音效，不加载任何音频文件。 */
class Sfx {
  constructor() {
    this.ctx = null;
  }

  ensure() {
    if (!this.ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  blip({ type = "square", from = 660, to = from, duration = 0.06, gain = 0.035, delay = 0 }) {
    const ac = this.ensure();
    if (!ac) return;
    const start = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), start + duration);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  noise({ duration = 0.5, gain = 0.12 } = {}) {
    const ac = this.ensure();
    if (!ac) return;
    const frames = Math.floor(ac.sampleRate * duration);
    const buffer = ac.createBuffer(1, frames, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      const decay = 1 - i / frames;
      data[i] = (Math.random() * 2 - 1) * decay * decay;
    }
    const source = ac.createBufferSource();
    source.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    const amp = ac.createGain();
    amp.gain.value = gain;
    source.connect(filter);
    filter.connect(amp);
    amp.connect(ac.destination);
    source.start();
  }

  play(name) {
    switch (name) {
      case "click":
        this.blip({ from: 720, to: 560, duration: 0.045, gain: 0.025 });
        break;
      case "tab":
        this.blip({ type: "triangle", from: 880, to: 1180, duration: 0.05, gain: 0.03 });
        break;
      case "success":
        this.blip({ type: "triangle", from: 660, to: 660, duration: 0.07, gain: 0.03 });
        this.blip({ type: "triangle", from: 990, to: 990, duration: 0.09, gain: 0.03, delay: 0.07 });
        break;
      case "error":
        this.blip({ type: "sawtooth", from: 220, to: 140, duration: 0.14, gain: 0.03 });
        break;
      case "boom":
        this.noise({ duration: 0.7, gain: 0.16 });
        break;
      case "levelup":
        this.blip({ type: "triangle", from: 520, duration: 0.09, gain: 0.03 });
        this.blip({ type: "triangle", from: 784, duration: 0.09, gain: 0.03, delay: 0.09 });
        this.blip({ type: "triangle", from: 1046, duration: 0.16, gain: 0.03, delay: 0.18 });
        break;
      default:
        break;
    }
  }
}

/** 聊天台 + 候选列表 + 输入框 + 覆盖层。 */
export class Console {
  constructor() {
    this.log = document.getElementById("log");
    this.suggest = document.getElementById("suggest");
    this.input = document.getElementById("cmd");
    this.hint = document.getElementById("hint");
    this.debug = document.getElementById("debug");
    this.toasts = document.getElementById("toasts");
    this.bigTitle = document.getElementById("big-title");
    this.death = document.getElementById("death");
    this.deathCause = document.getElementById("death-cause");
    this.deathScore = document.getElementById("death-score");
    this.pause = document.getElementById("pause");
    this.ctx = null;
    this.onPickSuggestion = null;
    this.onPickCommand = null;
    this.onDeathAction = null;
    this.sfx = new Sfx();
    this.achievements = new Set();
    this.panorama = new Panorama(document.getElementById("panorama"));
    this.panorama.start();
    this.setGui(2);
    this.bindChrome();
    // 行高要等字体和布局就绪后再量：可视高度始终是整数行，滚动位置始终停在行首。
    requestAnimationFrame(() => this.fitLog());
    document.fonts?.ready.then(() => this.fitLog());
  }

  /** app.js 组装好 ctx 后调用。 */
  attach(ctx) {
    this.ctx = ctx;
  }

  bindChrome() {
    this.input.addEventListener("focus", () => this.input.classList.add("focused"));
    this.input.addEventListener("blur", () => this.input.classList.remove("focused"));

    // 聊天区按「整行」滚动：一格滚轮正好一行，不做平滑/惯性滚动，尽量还原游戏里的手感。
    this.log.addEventListener(
      "wheel",
      (event) => {
        if (!event.deltaY) return;
        event.preventDefault();
        const line = this.lineHeight();
        const top = Math.round(this.log.scrollTop / line) * line;
        const maxTop = Math.max(0, this.log.scrollHeight - this.log.clientHeight);
        const next = top + (event.deltaY > 0 ? line : -line);
        this.log.scrollTop = Math.max(0, Math.min(next, maxTop));
        this.snapLog();
      },
      { passive: false },
    );

    // 拖动滚动条 / 触控板滚动时不要每帧纠正 scrollTop：那会和手指抢位置，看起来就是乱跳。
    // 按住（多半是在拖滚动条）期间完全不碰 scrollTop，松手后再吸回整行；其余滚动方式
    // 等它自己静下来再吸，滚动过程保持平滑。
    let settleTimer = 0;
    const snapLater = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => this.snapLog(), 160);
    };
    this.log.addEventListener(
      "scroll",
      () => {
        if (this._logPointer) return;
        snapLater();
      },
      { passive: true },
    );
    this.log.addEventListener(
      "scrollend",
      () => {
        if (this._logPointer) return;
        this.snapLog();
      },
      { passive: true },
    );
    this.log.addEventListener("pointerdown", () => { this._logPointer = true; }, { passive: true });
    window.addEventListener("pointerup", () => {
      if (!this._logPointer) return;
      this._logPointer = false;
      this.snapLog();
    });

    this.suggest.addEventListener("scroll", () => {
      this.snapSuggestSoon();
      this.updateSuggestEdges();
    }, { passive: true });

    // 候选栏也按行滚：一格滚轮正好一行，滚完吸附到行首，不会停在半行上。
    this.suggest.addEventListener(
      "wheel",
      (event) => {
        if (!event.deltaY) return;
        event.preventDefault();
        const step = this.suggestRowHeight();
        const top = Math.round(this.suggest.scrollTop / step) * step;
        const maxTop = Math.max(0, this.suggest.scrollHeight - this.suggest.clientHeight);
        const next = top + (event.deltaY > 0 ? step : -step);
        this.suggest.scrollTop = Math.max(0, Math.min(next, maxTop));
        this.snapSuggest();
        this.updateSuggestEdges();
      },
      { passive: false },
    );

    this.suggest.addEventListener("click", (event) => {
      const row = event.target.closest("[data-index]");
      if (!row) return;
      const index = Number(row.dataset.index);
      if (this.onPickSuggestion) this.onPickSuggestion(index);
      this.input.focus();
    });

    // 输入框里的内联预候选：把选中候选的剩余部分用淡灰色接在光标后面（原版行为）。
    const bar = this.input.closest("#bar");
    if (bar) {
      this.ghost = document.createElement("span");
      this.ghost.id = "cmd-ghost";
      this.ghost.hidden = true;
      this.ghost.setAttribute("aria-hidden", "true");
      bar.insertBefore(this.ghost, this.hint || null);
    }
    this.input.addEventListener(
      "scroll",
      () => {
        if (this.ghost && !this.ghost.hidden) this.positionGhost();
      },
      { passive: true },
    );

    // 候选框是浮层，窗口尺寸变化后要重新贴回输入行上方；聊天区的行数也要重算。
    window.addEventListener("resize", () => {
      this.fitLog();
      if (!this.suggestVisible) return;
      this.positionSuggest();
      this.updateSuggestEdges();
    });

    this.log.addEventListener("click", (event) => {
      const span = event.target.closest("[data-click]");
      if (!span) return;
      event.preventDefault();
      const value = span.dataset.click;
      if (!value) return;
      if (span.dataset.copy) {
        navigator.clipboard?.writeText(value).then(
          () => this.toast("已复制", value.slice(0, 60)),
          () => this.toast("复制失败", "浏览器拒绝了剪贴板访问"),
        );
        return;
      }
      if (this.onPickCommand) this.onPickCommand(value);
    });

    this.death.addEventListener("click", (event) => {
      const button = event.target.closest("[data-act]");
      if (!button) return;
      if (this.onDeathAction) this.onDeathAction(button.dataset.act);
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest("button, a, #suggest, #log, #debug, input")) return;
      this.input.focus();
    });
    window.addEventListener("focus", () => this.input.focus());
  }

  // ---------------------------------------------------------------- 聊天输出

  normalize(segments) {
    if (typeof segments === "string") return [{ text: segments, color: "white" }];
    if (!Array.isArray(segments)) return [normalizeSegment(segments)];
    return segments.map(normalizeSegment);
  }

  /** 把一段文字塞进元素，并把 CJK 段包成 .cjk。
   *  unifont 是 16px 点阵、MC 位图是 8px，前者的视觉像素只有一半，
   *  所以中文的硬阴影要单独用更小的偏移（styles.css 里的 --shadow-cjk）。 */
  fillText(parent, text) {
    const CJK =
      /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]|[\ud840-\ud87f][\udc00-\udfff]/;
    let run = "";
    let inCjk = false;
    const flush = () => {
      if (!run) return;
      if (inCjk) {
        const span = document.createElement("span");
        span.className = "cjk";
        span.textContent = run;
        parent.appendChild(span);
      } else {
        parent.appendChild(document.createTextNode(run));
      }
      run = "";
    };
    for (const ch of text) {
      const cjk = CJK.test(ch);
      if (cjk !== inCjk) {
        flush();
        inCjk = cjk;
      }
      run += ch;
    }
    flush();
  }

  append(segments, { echo = false, klass = "" } = {}) {
    const atBottom =
      this.log.scrollHeight - this.log.scrollTop - this.log.clientHeight < 48;
    const line = document.createElement("div");
    line.className = `line${klass ? ` ${klass}` : ""}`;
    for (const segment of this.normalize(segments)) {
      if (!segment.text) continue;
      const span = document.createElement("span");
      this.fillText(span, segment.text);
      span.style.color = colorOf(segment.color);
      if (segment.bold) span.style.fontWeight = "bold";
      if (segment.italic) span.style.fontStyle = "italic";
      if (segment.underline) span.style.textDecoration = "underline";
      if (segment.click) {
        span.dataset.click = segment.click;
        if (segment.copy) span.dataset.copy = "1";
        span.classList.add("link");
        span.title = segment.copy ? "点击复制" : "点击填入命令";
      }
      line.appendChild(span);
    }
    if (!line.childNodes.length) line.textContent = " ";
    this.log.appendChild(line);
    let removed = 0;
    while (this.log.childElementCount > MAX_LINES) {
      this.log.firstElementChild.remove();
      removed += 1;
    }
    this.fitLog();
    if (atBottom) this.scrollToEnd();
    else if (removed) this.log.scrollTop = Math.max(0, this.log.scrollTop - removed * this.lineHeight());
    else this.snapLog();
    return line;
  }

  echo(text) {
    this.append([[`› `, "dark_gray"], [text, "dark_gray"]], { echo: true, klass: "echo" });
  }

  printHelpHint() {
    this.append([
      ["输入 ", "gray"],
      ["/help", "green", { click: "/help" }],
      [" 看命令 · ", "gray"],
      ["Tab", "white"],
      [" 补全 · 候选显示在输入框上方", "gray"],
    ]);
  }

  printRaw(text) {
    const atBottom =
      this.log.scrollHeight - this.log.scrollTop - this.log.clientHeight < 48;
    const pre = document.createElement("pre");
    pre.className = "raw";
    pre.textContent = String(text ?? "");
    this.log.appendChild(pre);
    let removed = 0;
    while (this.log.childElementCount > MAX_LINES) {
      this.log.firstElementChild.remove();
      removed += 1;
    }
    this.fitLog();
    if (atBottom) this.scrollToEnd();
    else if (removed) this.log.scrollTop = Math.max(0, this.log.scrollTop - removed * this.lineHeight());
    else this.snapLog();
  }

  playerChat(name, text) {
    this.append([[`<${name}> `, "white"], [text, "white"]]);
  }

  ok(message) {
    this.append([[String(message), "green"]]);
    this.sound("success");
  }

  warn(message) {
    this.append([[String(message), "yellow"]]);
  }

  error(message, hint = "") {
    this.append([[`[错误] `, "red"], [String(message), "red"]]);
    if (hint) this.append([[`  ${hint}`, "dark_gray"]]);
    this.sound("error");
  }

  clear() {
    this.log.textContent = "";
    this.fitLog();
  }

  // ------------------------------------------------------- 终端式整行滚动

  /** 聊天区的行高（px）。CSS 用无单位 line-height，行高 = 行高系数 × 字号。 */
  lineHeight() {
    const style = getComputedStyle(this.log);
    const line = parseFloat(style.lineHeight);
    if (Number.isFinite(line) && line > 0) return line;
    return Math.round((parseFloat(style.fontSize) || 16) * 1.5);
  }

  /** 把聊天区高度裁成整数行，并把滚动位置吸回行首。 */
  fitLog() {
    const line = this.lineHeight();
    this.log.style.height = "";
    const content = this.log.scrollHeight;
    const maxLines = Math.max(1, Math.floor((window.innerHeight * 0.46) / line));
    const lines = Math.min(maxLines, Math.ceil(content / line));
    this.log.style.height = `${Math.max(0, lines * line)}px`;
    this.snapLog();
  }

  snapLog() {
    const line = this.lineHeight();
    const snapped = Math.round(this.log.scrollTop / line) * line;
    if (Math.abs(this.log.scrollTop - snapped) > 0.01) this.log.scrollTop = snapped;
  }

  scrollToEnd() {
    const line = this.lineHeight();
    const maxTop = Math.max(0, this.log.scrollHeight - this.log.clientHeight);
    this.log.scrollTop = Math.round(maxTop / line) * line;
  }

  suggestRowHeight() {
    const row = this.suggest.firstElementChild;
    return row ? row.getBoundingClientRect().height : 24;
  }

  snapSuggest() {
    const step = this.suggestRowHeight();
    if (!step) return;
    const snapped = Math.round(this.suggest.scrollTop / step) * step;
    if (Math.abs(this.suggest.scrollTop - snapped) > 0.01) this.suggest.scrollTop = snapped;
  }

  /** 拖动候选栏滚动条时先让它平滑走，停下再吸附；过程中纠正会和拖动打架。 */
  snapSuggestSoon() {
    window.clearTimeout(this._suggestSettle);
    this._suggestSettle = window.setTimeout(() => this.snapSuggest(), 160);
  }

  /** 候选栏高度也裁成整数行（9 行封顶），多出来的靠滚动看。 */
  fitSuggestHeight() {
    const step = this.suggestRowHeight();
    if (!step) return;
    const style = getComputedStyle(this.suggest);
    const border =
      (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
    const visible = Math.min(9, this.suggest.childElementCount);
    const height = Math.round(visible * step + border);
    this.suggest.style.height = `${height}px`;
    this.suggest.style.maxHeight = `${Math.round(9 * step + border)}px`;
  }

  // ---------------------------------------------------------------- 候选列表

  /**
   * 原版风格：候选框贴着当前补全词的起点，宽度正好容纳最宽的那条候选，
   * 最多显示 9 行；滚动条隐藏，鼠标悬停滚轮可翻，Tab 轮换时选中行自动滚进视野。
   * @param {{items: object[], base: string, typed: string, hint?: string}} result
   * @param {number} selected
   */
  renderSuggest(result, selected = 0) {
    const items = result.items || [];
    if (!items.length) {
      this.hideSuggest();
      return;
    }
    const base = result.base || "";
    const typed = String(result.typed ?? "");
    // 顶层命令的候选在原版里不带前导 `/`；面板仍对齐到命令名本身（跳过那个字符）。
    const stripSlash = items.some((item) => String(item.value ?? "").startsWith("/"));
    const labels = items.map((item) => {
      const value = String(item.value ?? "");
      return stripSlash && value.startsWith("/") ? value.slice(1) : value;
    });
    const slashWidth = stripSlash && typed.startsWith("/") ? this.textWidth("/") : 0;
    const offset = this.measureSuggestOffset(base) + slashWidth;

    this.suggest.hidden = false;
    this.suggest.textContent = "";
    this.suggest.style.marginLeft = `${offset}px`;
    this.suggest.style.width = "auto";

    labels.forEach((label, index) => {
      const row = document.createElement("div");
      row.className = "suggest-row";
      row.dataset.index = String(index);
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", index === selected ? "true" : "false");
      if (index === selected) row.classList.add("selected");
      // 整行单色：选中的整行黄、其余灰；已经打出来的那一段改到输入框里当预候选。
      this.fillText(row, label);
      this.suggest.appendChild(row);
    });

    this.suggest.style.width = `${this.fitSuggestWidth(labels, offset)}px`;
    this.positionSuggest();
    this.fitSuggestHeight();
    // 行的数量变了，旧滚动位置要先夹回范围再吸到行首。
    const maxTop = Math.max(0, this.suggest.scrollHeight - this.suggest.clientHeight);
    this.suggest.scrollTop = Math.min(this.suggest.scrollTop, maxTop);
    this.snapSuggest();

    const active = this.suggest.children[selected];
    if (active) {
      // 用视口矩形算，别用 offsetTop：offsetParent 是 #console，直接拿会错位并多滚一段。
      const box = this.suggest.getBoundingClientRect();
      const row = active.getBoundingClientRect();
      if (row.top < box.top) this.suggest.scrollTop -= box.top - row.top;
      else if (row.bottom > box.bottom) this.suggest.scrollTop += row.bottom - box.bottom;
      // 吸附到整行，避免 Tab 轮换后停在半行。
      this.snapSuggest();
    }

    // 滚动边线要在布局完成后再量：先同步量一次，下一帧再补一次（字体异步加载会改变行宽）。
    // 预候选只在「base + typed 确实等于输入框里的文字」时才有意义；不一致说明是旧结果，
    // 宁可不画，也不要把整条候选重复到光标后面。
    const consistent = this.input.value === base + typed;
    this.updateGhost(consistent ? items : [], selected, typed);
    this.updateSuggestEdges();
    requestAnimationFrame(() => this.updateSuggestEdges());
  }

  /** 候选框按内容定宽：取所有候选里最宽的一条，最多铺到可用宽度。 */
  fitSuggestWidth(labels, offset) {
    if (!this.measureCanvas) {
      this.measureCanvas = document.createElement("canvas");
      this.measureCtx = this.measureCanvas.getContext("2d");
    }
    const row = this.suggest.firstElementChild;
    const rowStyle = row ? getComputedStyle(row) : null;
    const panelStyle = getComputedStyle(this.suggest);
    const fontStyle = rowStyle || panelStyle;
    this.measureCtx.font = `${fontStyle.fontStyle} ${fontStyle.fontWeight} ${fontStyle.fontSize} ${fontStyle.fontFamily}`;

    let textWidth = 0;
    for (const label of labels) {
      const width = this.measureCtx.measureText(String(label ?? "")).width;
      if (width > textWidth) textWidth = width;
    }

    const rowPad = rowStyle
      ? (parseFloat(rowStyle.paddingLeft) || 0) + (parseFloat(rowStyle.paddingRight) || 0)
      : 0;
    const boxPad =
      (parseFloat(panelStyle.paddingLeft) || 0) +
      (parseFloat(panelStyle.paddingRight) || 0) +
      (parseFloat(panelStyle.borderLeftWidth) || 0) +
      (parseFloat(panelStyle.borderRightWidth) || 0);

    const panelWidth = this.suggest.parentElement?.clientWidth || window.innerWidth;
    const available = Math.max(60, panelWidth - offset - 4);
    return Math.max(60, Math.min(Math.ceil(textWidth + rowPad + boxPad + 2), available));
  }

  /**
   * 候选框是浮层：绝对定位在输入行上方，不占聊天区高度，也不会和聊天框贴在一起。
   * #console 是 fixed 容器，所以这里算的是「从容器底边到输入行顶边、再让开一个 gap」。
   */
  positionSuggest() {
    const bar = this.input.closest("#bar");
    const host = this.suggest.parentElement;
    if (!bar || !host) return;
    const hostStyle = getComputedStyle(host);
    const gap = parseFloat(hostStyle.rowGap || hostStyle.gap) || 0;
    const bottom = host.getBoundingClientRect().bottom - bar.getBoundingClientRect().top + gap;
    this.suggest.style.bottom = `${Math.max(0, Math.round(bottom))}px`;
  }

  /** 有被遮住的候选时，在对应一侧画一道黑底白线（原版的「还能翻」提示）。 */
  updateSuggestEdges() {
    const el = this.suggest;
    if (el.hidden) {
      el.removeAttribute("data-more-up");
      el.removeAttribute("data-more-down");
      return;
    }
    const up = el.scrollTop > 1;
    const down = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    el.toggleAttribute("data-more-up", up);
    el.toggleAttribute("data-more-down", down);
  }

  /**
   * 候选框左缘的像素缩进：base 文本宽度 + 输入框左侧内边距，正好停在当前词的起点。
   * 位置只用于对齐，候选行内不会再显示 base。
   */
  measureSuggestOffset(base) {
    if (!base) return 0;
    if (!this.measureCanvas) {
      this.measureCanvas = document.createElement("canvas");
      this.measureCtx = this.measureCanvas.getContext("2d");
    }
    const inputStyle = getComputedStyle(this.input);
    this.measureCtx.font = `${inputStyle.fontStyle} ${inputStyle.fontWeight} ${inputStyle.fontSize} ${inputStyle.fontFamily}`;
    const textWidth = this.measureCtx.measureText(base).width;

    let inset = parseFloat(inputStyle.paddingLeft) || 0;
    const bar = this.input.closest("#bar");
    if (bar) {
      const barStyle = getComputedStyle(bar);
      inset += (parseFloat(barStyle.borderLeftWidth) || 0) + (parseFloat(barStyle.paddingLeft) || 0);
    }

    const panelWidth = this.suggest.parentElement?.clientWidth || window.innerWidth;
    const fontSize = parseFloat(inputStyle.fontSize) || 16;
    const offset = Math.min(textWidth + inset, Math.max(0, panelWidth - fontSize * 6));
    return Math.max(0, Math.round(offset));
  }

  /** 按输入框的字体量一段文字的像素宽（用于内联预候选和 `/` 缩进）。 */
  textWidth(text, element = this.input) {
    if (!this.measureCanvas) {
      this.measureCanvas = document.createElement("canvas");
      this.measureCtx = this.measureCanvas.getContext("2d");
    }
    const style = getComputedStyle(element);
    this.measureCtx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    return this.measureCtx.measureText(String(text)).width;
  }

  /**
   * 输入框里的内联预候选：选中候选去掉已输入部分后剩下的字符，用淡灰画在光标后面。
   * 候选列表只负责列名字，不再重复画已输入的部分。
   */
  updateGhost(items, selected, typed) {
    if (!this.ghost) return;
    const item = items[selected];
    const value = item ? String(item.value ?? "") : "";
    const remainder =
      value && typed && value.length > typed.length && value.toLowerCase().startsWith(typed.toLowerCase())
        ? value.slice(typed.length)
        : "";
    if (!remainder) {
      this.ghost.hidden = true;
      this.ghost.textContent = "";
      return;
    }
    this.ghost.textContent = "";
    this.fillText(this.ghost, remainder);
    this.ghost.hidden = false;
    this.positionGhost();
  }

  /** 预候选紧贴光标：输入框内容的左缘 + 已输入文字的宽度 - 横向滚动量。
   *  坐标取整到整数像素：小数位置会让字形被半像素采样，边缘发灰。
   *  #bar 自身的 left/top 可能带小数，所以减掉它再写行内样式，让页面坐标是整数。 */
  positionGhost() {
    if (!this.ghost || this.ghost.hidden) return;
    const bar = this.input.closest("#bar");
    if (!bar) return;
    const inputBox = this.input.getBoundingClientRect();
    const barBox = bar.getBoundingClientRect();
    const style = getComputedStyle(this.input);
    const padLeft = parseFloat(style.paddingLeft) || 0;
    const padTop = parseFloat(style.paddingTop) || 0;
    const x = inputBox.left + padLeft + this.textWidth(this.input.value) - this.input.scrollLeft;
    const y = inputBox.top + padTop;
    this.ghost.style.left = `${Math.round(x) - barBox.left}px`;
    this.ghost.style.top = `${Math.round(y) - barBox.top}px`;
  }

  hideSuggest() {
    this.suggest.hidden = true;
    this.suggest.textContent = "";
    this.suggest.removeAttribute("data-more-up");
    this.suggest.removeAttribute("data-more-down");
    if (this.ghost) {
      this.ghost.hidden = true;
      this.ghost.textContent = "";
    }
  }

  get suggestVisible() {
    return !this.suggest.hidden && this.suggest.childElementCount > 0;
  }

  setHint(text) {
    this.hint.textContent = text || "";
  }

  // ---------------------------------------------------------------- 输入

  get value() {
    return this.input.value;
  }

  setInput(text, caret = text.length) {
    this.input.value = text;
    this.input.setSelectionRange(caret, caret);
  }

  focus() {
    this.input.focus();
  }

  shakeInput() {
    this.input.classList.remove("shake");
    void this.input.offsetWidth;
    this.input.classList.add("shake");
    setTimeout(() => this.input.classList.remove("shake"), 260);
  }

  shake() {
    document.body.classList.remove("quake");
    void document.body.offsetWidth;
    document.body.classList.add("quake");
    setTimeout(() => document.body.classList.remove("quake"), 620);
  }

  // ---------------------------------------------------------------- 覆盖层

  toast(title, subtitle = "") {
    const box = document.createElement("div");
    box.className = "toast";
    const head = document.createElement("div");
    head.className = "toast-head";
    head.textContent = "成就已达成！";
    const name = document.createElement("div");
    name.className = "toast-title";
    name.textContent = title;
    box.append(head, name);
    if (subtitle) {
      const sub = document.createElement("div");
      sub.className = "toast-sub";
      sub.textContent = subtitle;
      box.append(sub);
    }
    this.toasts.appendChild(box);
    while (this.toasts.childElementCount > 3) this.toasts.firstElementChild.remove();
    this.sound("levelup");
    setTimeout(() => {
      box.classList.add("out");
      setTimeout(() => box.remove(), 400);
    }, 4200);
  }

  achievement(id, title, subtitle) {
    if (this.achievements.has(id)) return false;
    this.achievements.add(id);
    this.toast(title, subtitle);
    return true;
  }

  title(text) {
    this.bigTitle.textContent = text || "　";
    this.bigTitle.hidden = false;
    this.bigTitle.classList.remove("show");
    void this.bigTitle.offsetWidth;
    this.bigTitle.classList.add("show");
    clearTimeout(this._titleTimer);
    this._titleTimer = setTimeout(() => {
      this.bigTitle.hidden = true;
    }, 2400);
  }

  die(cause) {
    this.deathCause.textContent = cause || "死了";
    this.deathScore.textContent = String(this.getScore ? this.getScore() : 0);
    this.death.hidden = false;
    this.sound("boom");
  }

  respawn() {
    this.death.hidden = true;
  }

  openPause() {
    this.pause.hidden = false;
  }

  closePause() {
    this.pause.hidden = true;
  }

  get pauseOpen() {
    return !this.pause.hidden;
  }

  toggleDebug() {
    this.debug.hidden = !this.debug.hidden;
  }

  get debugVisible() {
    return !this.debug.hidden;
  }

  updateDebug(lines) {
    if (this.debug.hidden) return;
    this.debug.textContent = lines;
  }

  // ---------------------------------------------------------------- 环境

  setTime(time) {
    document.body.dataset.time = time;
    this.panorama.setTime(time);
  }

  setWeather(weather) {
    document.body.dataset.weather = weather;
  }

  setGamemode(mode) {
    document.body.dataset.gamemode = mode;
  }

  setGui(scale) {
    document.documentElement.style.setProperty("--gui", String(scale));
  }

  /** 是否强制 Unicode 字形：true 时 unifont 压到 mc_seven 上面。 */
  setUnicode(on) {
    document.body.dataset.unicode = on ? "on" : "off";
  }

  sound(name) {
    if (this.ctx && this.ctx.state && this.ctx.state.sound === false) return;
    this.sfx.play(name);
  }
}
