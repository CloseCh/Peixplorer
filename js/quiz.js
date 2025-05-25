let currentQuestionIndex = 0;
let selectedAnswerIndex = null;
let questions = [];
let countdownInterval;

async function loadQuestions() {
  const res = await fetch('json/quiz.json');
  const data = await res.json();
  questions = data.hasPart;
  showQuestion();
}

function showQuestion() {
  const question = questions[currentQuestionIndex];
  document.getElementById("question-number").textContent = `Pregunta ${currentQuestionIndex + 1} de ${questions.length}`;
  document.getElementById("question-text").textContent = question.text;

  const answersDiv = document.getElementById("answers");
  answersDiv.innerHTML = "";
  question.suggestedAnswer.forEach((ans, index) => {
    const btn = document.createElement("button");
    btn.className = "list-group-item list-group-item-action";
    btn.textContent = ans.text;
    btn.addEventListener("click", () => {
      document.querySelectorAll("#answers button").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedAnswerIndex = index;
      document.getElementById("next-btn").disabled = false;
    });
    answersDiv.appendChild(btn);
  });

  document.getElementById("feedback").classList.add("d-none");
  document.getElementById("restart-btn").classList.add("d-none");
  document.getElementById("next-btn").disabled = true;

  updateProgress();
}

function updateProgress() {
  const progress = Math.round(((currentQuestionIndex) / questions.length) * 100);
  document.getElementById("quiz-progress").style.width = `${progress}%`;
}

document.getElementById("next-btn").addEventListener("click", () => {
  if (selectedAnswerIndex === null) return;

  lockAnswer();
});

function lockAnswer() {
  const question = questions[currentQuestionIndex];
  const answers = document.querySelectorAll("#answers button");

  answers.forEach((btn, index) => {
    btn.disabled = true;
    const isCorrect = question.suggestedAnswer[index].text === question.acceptedAnswer.text;

    if (isCorrect) btn.classList.add("list-group-item-success");
    if (index === selectedAnswerIndex && !isCorrect) btn.classList.add("list-group-item-danger");
  });

  const isCorrect = question.suggestedAnswer[selectedAnswerIndex].text === question.acceptedAnswer.text;
  const feedback = document.getElementById("feedback");
  feedback.classList.remove("d-none", "alert-success", "alert-danger");
  feedback.classList.add(isCorrect ? "alert-success" : "alert-danger");
  feedback.textContent = isCorrect ? "¡Correcto!" : `Incorrecto. La respuesta correcta es: ${question.acceptedAnswer.text}`;

  document.getElementById("next-btn").disabled = true;

  startCountdown(() => {
    currentQuestionIndex++;
    selectedAnswerIndex = null;
    if (currentQuestionIndex < questions.length) {
      showQuestion();
    } else {
      showFinalMessage();
    }
  });
}

function startCountdown(callback) {
  const countdownContainer = document.getElementById("countdown-container");
  const countdownBar = document.getElementById("countdown-bar");

  // Reset width & transition first
  countdownBar.style.transition = "none";
  countdownBar.style.width = "0%";
  countdownContainer.classList.remove("d-none");

  // Force a reflow (to apply width = 0%)
  setTimeout(() => {
    // Now start the transition to 100%
    countdownBar.style.transition = "width 3s linear";
    countdownBar.style.width = "100%";
  }, 50); // Slight delay to ensure transition applies

  // After 5s, hide and reset
  setTimeout(() => {
    countdownContainer.classList.add("d-none");
    countdownBar.style.transition = "none";
    countdownBar.style.width = "0%";
    callback();
  }, 3050); // match delay + animation
}


function showFinalMessage() {
  document.getElementById("question-number").textContent = "¡Has completado el quiz!";
  document.getElementById("question-text").textContent = "¡Buen trabajo!";
  document.getElementById("answers").innerHTML = "";
  document.getElementById("feedback").classList.add("d-none");
  document.getElementById("restart-btn").classList.remove("d-none");
  document.getElementById("next-btn").classList.add("d-none");
}

document.getElementById("restart-btn").addEventListener("click", () => {
  currentQuestionIndex = 0;
  selectedAnswerIndex = null;
  document.getElementById("next-btn").classList.remove("d-none");
  loadQuestions();
});

loadQuestions();
