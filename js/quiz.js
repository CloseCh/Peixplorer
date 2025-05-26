/**
 * ===================================
 * QUIZ APPLICATION - REDESIGNED & IMPROVED
 * ===================================
 * 
 * Enhanced quiz application for fish knowledge testing
 * Features: Modern ES6+ syntax, improved accessibility, 
 * better error handling, enhanced user experience,
 * fixed countdown animation, and consistent modal sizing
 */

class QuizApp {
  /**
   * Initialize the Quiz Application
   */
  constructor() {
    // Configuration constants
    this.CONFIG = {
      TOTAL_QUESTIONS: 10,
      COUNTDOWN_TIME: 3000, // 3 seconds
      STORAGE_KEY: 'fishQuizStats',
      QUESTIONS_FILE: 'json/quiz.json',
      MAX_STORED_GAMES: 50
    };

    // Application state
    this.state = {
      currentQuestionIndex: 0,
      selectedAnswerIndex: null,
      allQuestions: [],
      quizQuestions: [],
      userAnswers: [],
      quizStartTime: null,
      countdownInterval: null,
      isQuizActive: false
    };

    // DOM elements cache
    this.elements = {};

    // Initialize application
    this.init();
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      this.cacheDOMElements();
      this.bindEventListeners();
      await this.loadQuestions();
      this.displayStats();
      this.hidePreloader();
    } catch (error) {
      this.handleError('Error initializing quiz application', error);
    }
  }

  /**
   * Cache all DOM elements for better performance
   */
  cacheDOMElements() {
    // Navigation elements
    this.elements.mainMenu = document.getElementById('main-menu');
    this.elements.statsView = document.getElementById('stats-view');
    this.elements.startQuizBtn = document.getElementById('start-quiz-btn');
    this.elements.viewStatsBtn = document.getElementById('view-stats-btn');
    this.elements.backToMenuBtn = document.getElementById('back-to-menu');

    // Modal elements
    this.elements.quizModal = new bootstrap.Modal(document.getElementById('quizModal'), {
      backdrop: 'static',
      keyboard: false
    });
    this.elements.quizModalElement = document.getElementById('quizModal');
    this.elements.quizView = document.getElementById('quiz-view');
    this.elements.resultsView = document.getElementById('results-view');

    // Quiz elements
    this.elements.questionNumber = document.getElementById('question-number');
    this.elements.progressText = document.getElementById('progress-text');
    this.elements.questionText = document.getElementById('question-text');
    this.elements.answersContainer = document.getElementById('answers');
    this.elements.feedback = document.getElementById('feedback');
    this.elements.quizProgress = document.getElementById('quiz-progress');
    this.elements.countdownContainer = document.getElementById('countdown-container');
    this.elements.countdownBar = document.getElementById('countdown-bar');

    // Result elements
    this.elements.resultsButtons = document.getElementById('results-buttons');
    this.elements.playAgainBtn = document.getElementById('play-again-btn');
    this.elements.backToMenuFromResults = document.getElementById('back-to-menu-from-results');
    this.elements.finalScoreTitle = document.getElementById('final-score-title');
    this.elements.finalScore = document.getElementById('final-score');
    this.elements.resultsMessage = document.getElementById('results-message');
    this.elements.questionsReview = document.getElementById('questions-review');

    // Statistics elements
    this.elements.totalGames = document.getElementById('total-games');
    this.elements.avgScore = document.getElementById('avg-score');
    this.elements.bestScore = document.getElementById('best-score');
    this.elements.totalCorrect = document.getElementById('total-correct');
    this.elements.gamesList = document.getElementById('games-list');

    // Other elements
    this.elements.preloader = document.getElementById('preloader');
  }

  /**
   * Bind event listeners
   */
  bindEventListeners() {
    // Navigation events
    this.elements.startQuizBtn?.addEventListener('click', () => this.startQuiz());
    this.elements.startQuizBtn?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.startQuiz();
      }
    });

    this.elements.viewStatsBtn?.addEventListener('click', () => this.showStats());
    this.elements.viewStatsBtn?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.showStats();
      }
    });

    this.elements.backToMenuBtn?.addEventListener('click', () => this.showMainMenu());

    // Result buttons
    this.elements.playAgainBtn?.addEventListener('click', () => this.restartQuiz());
    this.elements.backToMenuFromResults?.addEventListener('click', () => this.closeModalAndShowMenu());

    // Modal events
    this.elements.quizModalElement?.addEventListener('hidden.bs.modal', () => {
      if (!this.state.isQuizActive) {
        this.resetQuiz();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));

    // Window events
    window.addEventListener('beforeunload', (e) => {
      if (this.state.isQuizActive) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyboardNavigation(event) {
    if (!this.state.isQuizActive) return;

    const { key } = event;

    // Number keys for answers (1-4)
    if (key >= '1' && key <= '4') {
      const answerIndex = parseInt(key) - 1;
      const answerButtons = this.elements.answersContainer.querySelectorAll('.answer-button');
      if (answerButtons[answerIndex] && !answerButtons[answerIndex].disabled) {
        event.preventDefault();
        answerButtons[answerIndex].click();
      }
    }

    // Escape key to close modal
    if (key === 'Escape' && this.state.isQuizActive) {
      if (confirm('¿Estás seguro de que quieres salir del quiz? Se perderá tu progreso.')) {
        this.closeModalAndShowMenu();
      }
    }
  }

  /**
   * Load questions from JSON file
   */
  async loadQuestions() {
    try {
      const response = await fetch(this.CONFIG.QUESTIONS_FILE);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.hasPart || !Array.isArray(data.hasPart)) {
        throw new Error('Invalid questions data format');
      }

      this.state.allQuestions = data.hasPart;

      if (this.state.allQuestions.length < this.CONFIG.TOTAL_QUESTIONS) {
        console.warn(`Only ${this.state.allQuestions.length} questions available, less than required ${this.CONFIG.TOTAL_QUESTIONS}`);
      }

    } catch (error) {
      this.handleError('Error loading questions', error);
      throw error;
    }
  }

  /**
   * Hide preloader with smooth animation
   */
  hidePreloader() {
    if (this.elements.preloader) {
      this.elements.preloader.style.opacity = '0';
      setTimeout(() => {
        this.elements.preloader.style.display = 'none';
      }, 300);
    }
  }

  // ===================================
  // NAVIGATION METHODS
  // ===================================

  /**
   * Show main menu
   */
  showMainMenu() {
    this.elements.mainMenu.style.display = 'block';
    this.elements.statsView.style.display = 'none';

    // Add entrance animation
    this.elements.mainMenu.classList.add('fade-in');

    // Focus management for accessibility
    this.elements.startQuizBtn?.focus();
  }

  /**
   * Show statistics view
   */
  showStats() {
    this.elements.mainMenu.style.display = 'none';
    this.elements.statsView.style.display = 'block';

    // Add entrance animation
    this.elements.statsView.classList.add('fade-in');

    // Update stats display
    this.displayStats();

    // Focus management
    this.elements.backToMenuBtn?.focus();
  }

  // ===================================
  // QUIZ MANAGEMENT
  // ===================================

  /**
   * Start a new quiz
   */
  async startQuiz() {
    try {
      if (this.state.allQuestions.length === 0) {
        throw new Error('Questions not loaded yet');
      }

      this.selectRandomQuestions();
      this.resetQuizState();
      this.state.quizStartTime = new Date();
      this.state.isQuizActive = true;

      this.showQuizModal();
      await this.showQuestion();

    } catch (error) {
      this.handleError('Error starting quiz', error);
    }
  }

  /**
   * Select random questions for the quiz
   */
  selectRandomQuestions() {
    const availableQuestions = [...this.state.allQuestions];
    const questionsNeeded = Math.min(this.CONFIG.TOTAL_QUESTIONS, availableQuestions.length);

    // Fisher-Yates shuffle algorithm for better randomization
    for (let i = availableQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableQuestions[i], availableQuestions[j]] = [availableQuestions[j], availableQuestions[i]];
    }

    this.state.quizQuestions = availableQuestions.slice(0, questionsNeeded);
  }

  /**
   * Reset quiz state - IMPROVED
   */
  resetQuizState() {
    this.state.currentQuestionIndex = 0;
    this.state.selectedAnswerIndex = null;
    this.state.userAnswers = [];
    this.clearCountdown();

    // Ensure feedback and countdown are properly hidden but reserve space
    if (this.elements.feedback) {
      this.elements.feedback.classList.add('d-none');
      this.elements.feedback.innerHTML = ''; // Clear content
    }

    if (this.elements.countdownContainer) {
      this.elements.countdownContainer.classList.add('d-none');
    }
  }

  /**
   * Show quiz modal
   */
  showQuizModal() {
    this.elements.quizView.style.display = 'block';
    this.elements.resultsView.style.display = 'none';
    this.elements.resultsButtons.style.display = 'none';

    this.elements.quizModal.show();
  }

  /**
   * Show current question - IMPROVED
   */
  async showQuestion() {
    const question = this.state.quizQuestions[this.state.currentQuestionIndex];
    const questionNumber = this.state.currentQuestionIndex + 1;
    const totalQuestions = this.state.quizQuestions.length;

    // Update question information
    this.elements.questionNumber.textContent = `Pregunta ${questionNumber}`;
    this.elements.progressText.textContent = `${questionNumber} de ${totalQuestions}`;
    this.elements.questionText.textContent = question.text;

    // Clear previous answers
    this.elements.answersContainer.innerHTML = '';

    // Create answer buttons with improved accessibility
    question.suggestedAnswer.forEach((answer, index) => {
      const button = this.createAnswerButton(answer.text, index, questionNumber);
      this.elements.answersContainer.appendChild(button);
    });

    // Reset UI state - IMPROVED: Always hide but keep space reserved
    this.state.selectedAnswerIndex = null;
    this.elements.feedback.classList.add('d-none');
    this.elements.countdownContainer.classList.add('d-none');

    // Clear any previous feedback content
    this.elements.feedback.innerHTML = '';

    // Reset countdown bar
    if (this.elements.countdownBar) {
      this.elements.countdownBar.style.transition = 'none';
      this.elements.countdownBar.style.width = '0%';
      this.elements.countdownBar.classList.remove('animate');
    }

    // Update progress bar
    this.updateProgress();

    // Add animation
    this.elements.answersContainer.classList.add('fade-in');

    // Focus first answer for keyboard navigation
    const firstAnswer = this.elements.answersContainer.querySelector('.answer-button');
    if (firstAnswer) {
      firstAnswer.focus();
    }
  }

  /**
   * Create an answer button with improved accessibility
   */
  createAnswerButton(text, index, questionNumber) {
    const button = document.createElement('button');
    button.className = 'answer-button';
    button.textContent = text;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-describedby', 'question-text');
    button.setAttribute('data-answer-index', index);

    // Keyboard support
    button.addEventListener('click', () => this.selectAndProcessAnswer(index, button));
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.selectAndProcessAnswer(index, button);
      }
    });

    return button;
  }

  /**
   * Select and process answer
   */
  selectAndProcessAnswer(index, buttonEl) {
    // Prevent multiple selections
    if (this.state.selectedAnswerIndex !== null) return;

    // Select answer
    this.state.selectedAnswerIndex = index;
    buttonEl.classList.add('selected');
    buttonEl.setAttribute('aria-checked', 'true');

    // Process immediately
    this.lockAnswers();
    this.showFeedback();
    this.saveUserAnswer();

    this.startCountdown(() => {
      this.moveToNextQuestion();
    });
  }

  /**
   * Lock all answer buttons and show correct/incorrect states
   */
  lockAnswers() {
    const buttons = this.elements.answersContainer.querySelectorAll('.answer-button');
    const question = this.state.quizQuestions[this.state.currentQuestionIndex];

    buttons.forEach((button, index) => {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');

      const isCorrect = question.suggestedAnswer[index].text === question.acceptedAnswer.text;

      if (isCorrect) {
        button.classList.add('correct');
        button.setAttribute('aria-label', `${button.textContent} - Respuesta correcta`);
      }

      if (index === this.state.selectedAnswerIndex && !isCorrect) {
        button.classList.add('incorrect');
        button.setAttribute('aria-label', `${button.textContent} - Respuesta incorrecta`);
      }
    });
  }

  /**
   * Show feedback for the current answer - IMPROVED
   */
  showFeedback() {
    const question = this.state.quizQuestions[this.state.currentQuestionIndex];
    const selectedAnswer = question.suggestedAnswer[this.state.selectedAnswerIndex];
    const isCorrect = selectedAnswer.text === question.acceptedAnswer.text;

    // Remove d-none to show feedback but keep space reserved
    this.elements.feedback.classList.remove('d-none', 'alert-success', 'alert-danger');
    this.elements.feedback.classList.add(isCorrect ? 'alert-success' : 'alert-danger');

    if (isCorrect) {
      this.elements.feedback.innerHTML = `
        <i class="bi bi-check-circle-fill me-2" aria-hidden="true"></i>
        <strong>¡Correcto!</strong> Has elegido la respuesta adecuada.
      `;
    } else {
      this.elements.feedback.innerHTML = `
        <i class="bi bi-x-circle-fill me-2" aria-hidden="true"></i>
        <strong>Incorrecto.</strong> La respuesta correcta es: ${question.acceptedAnswer.text}
      `;
    }

    // Announce to screen readers
    this.elements.feedback.setAttribute('aria-live', 'polite');
  }

  /**
   * Save user's answer
   */
  saveUserAnswer() {
    const question = this.state.quizQuestions[this.state.currentQuestionIndex];
    const selectedAnswer = question.suggestedAnswer[this.state.selectedAnswerIndex];
    const isCorrect = selectedAnswer.text === question.acceptedAnswer.text;

    this.state.userAnswers.push({
      question: question,
      selectedAnswer: selectedAnswer,
      correctAnswer: question.acceptedAnswer,
      isCorrect: isCorrect,
      timeStamp: new Date()
    });
  }

  /**
   * Start countdown timer - COMPLETELY IMPROVED
   */
  startCountdown(callback) {
    if (!this.elements.countdownContainer || !this.elements.countdownBar) {
      console.warn('Countdown elements not found');
      setTimeout(callback, this.CONFIG.COUNTDOWN_TIME);
      return;
    }

    // Show countdown container
    this.elements.countdownContainer.classList.remove('d-none');

    // Reset countdown bar with proper animation control
    this.elements.countdownBar.style.transition = 'none';
    this.elements.countdownBar.style.width = '0%';
    this.elements.countdownBar.classList.remove('animate');

    // Force reflow to ensure the reset is applied
    this.elements.countdownBar.offsetHeight;

    // Start the animation using requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      this.elements.countdownBar.style.transition = `width ${this.CONFIG.COUNTDOWN_TIME}ms linear`;
      this.elements.countdownBar.classList.add('animate');
      this.elements.countdownBar.style.width = '100%';
    });

    // Execute callback after countdown
    this.state.countdownInterval = setTimeout(() => {
      // Hide countdown and reset
      this.elements.countdownContainer.classList.add('d-none');
      this.elements.countdownBar.style.transition = 'none';
      this.elements.countdownBar.style.width = '0%';
      this.elements.countdownBar.classList.remove('animate');

      // Execute the callback
      callback();
    }, this.CONFIG.COUNTDOWN_TIME);
  }

  /**
   * Clear countdown timer - IMPROVED
   */
  clearCountdown() {
    if (this.state.countdownInterval) {
      clearTimeout(this.state.countdownInterval);
      this.state.countdownInterval = null;
    }

    // Reset countdown bar state
    if (this.elements.countdownBar) {
      this.elements.countdownBar.style.transition = 'none';
      this.elements.countdownBar.style.width = '0%';
      this.elements.countdownBar.classList.remove('animate');
    }

    // Hide countdown container
    if (this.elements.countdownContainer) {
      this.elements.countdownContainer.classList.add('d-none');
    }
  }

  /**
   * Move to next question or show results
   */
  moveToNextQuestion() {
    this.state.currentQuestionIndex++;

    if (this.state.currentQuestionIndex < this.state.quizQuestions.length) {
      this.showQuestion();
    } else {
      this.showResults();
    }
  }

  /**
   * Update progress bar
   */
  updateProgress() {
    const progress = Math.round((this.state.currentQuestionIndex / this.state.quizQuestions.length) * 100);
    this.elements.quizProgress.style.width = `${progress}%`;
    this.elements.quizProgress.setAttribute('aria-valuenow', progress);
  }

  // ===================================
  // RESULTS MANAGEMENT
  // ===================================

  /**
   * Show quiz results
   */
  showResults() {
    this.state.isQuizActive = false;

    const correctAnswers = this.state.userAnswers.filter(answer => answer.isCorrect).length;
    const totalQuestions = this.state.userAnswers.length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);

    // Switch views
    this.elements.quizView.style.display = 'none';
    this.elements.resultsView.style.display = 'block';
    this.elements.resultsButtons.style.display = 'block';

    // Display results
    this.displayFinalScore(correctAnswers, totalQuestions, percentage);
    this.displayQuestionsReview();

    // Save statistics
    this.saveGameStats(correctAnswers, totalQuestions, percentage);

    // Focus management
    this.elements.playAgainBtn?.focus();
  }

  /**
   * Display final score
   */
  displayFinalScore(correct, total, percentage) {
    const scoreData = this.getScoreData(percentage);

    this.elements.finalScoreTitle.textContent = scoreData.message;
    this.elements.finalScore.textContent = `${correct}/${total} (${percentage}%)`;
    this.elements.finalScore.className = `final-score-display ${scoreData.class}`;

    // Add results message
    if (this.elements.resultsMessage) {
      this.elements.resultsMessage.textContent = scoreData.description;
    }
  }

  /**
   * Get score data based on percentage
   */
  getScoreData(percentage) {
    if (percentage >= 90) {
      return {
        message: '¡Excelente!',
        class: 'excellent',
        description: 'Tienes un conocimiento excepcional sobre peces marinos.'
      };
    } else if (percentage >= 70) {
      return {
        message: '¡Muy bien!',
        class: 'good',
        description: 'Demuestras un buen conocimiento sobre la vida marina.'
      };
    } else if (percentage >= 50) {
      return {
        message: 'Bien hecho',
        class: 'fair',
        description: 'Tienes conocimientos básicos, pero puedes mejorar.'
      };
    } else {
      return {
        message: 'Sigue practicando',
        class: 'poor',
        description: 'Te recomendamos repasar más sobre peces marinos.'
      };
    }
  }

  /**
   * Display questions review
   */
  displayQuestionsReview() {
    const reviewContainer = this.elements.questionsReview.querySelector('.review-container') ||
      this.elements.questionsReview;

    reviewContainer.innerHTML = '';

    this.state.userAnswers.forEach((userAnswer, index) => {
      const reviewItem = this.createQuestionReviewItem(userAnswer, index + 1);
      reviewContainer.appendChild(reviewItem);
    });
  }

  /**
   * Create question review item
   */
  createQuestionReviewItem(userAnswer, questionNumber) {
    const item = document.createElement('article');
    item.className = 'question-review-item';
    item.setAttribute('aria-labelledby', `review-question-${questionNumber}`);

    // Question Header with number badge
    const questionHeader = document.createElement('div');
    questionHeader.className = 'review-question-header';

    const numberBadge = document.createElement('div');
    numberBadge.className = 'question-number-badge';
    numberBadge.textContent = questionNumber;
    numberBadge.setAttribute('aria-label', `Pregunta número ${questionNumber}`);

    const questionText = document.createElement('h4');
    questionText.id = `review-question-${questionNumber}`;
    questionText.className = 'review-question-text';
    questionText.textContent = userAnswer.question.text;

    questionHeader.appendChild(numberBadge);
    questionHeader.appendChild(questionText);

    // Answers Container
    const answersContainer = document.createElement('div');
    answersContainer.className = 'review-answers';
    answersContainer.setAttribute('role', 'list');

    // Create review for each possible answer with enhanced styling
    userAnswer.question.suggestedAnswer.forEach((answer, index) => {
      const answerEl = document.createElement('div');
      answerEl.className = 'review-answer';
      answerEl.setAttribute('role', 'listitem');

      // Create answer icon
      const answerIcon = document.createElement('div');
      answerIcon.className = 'answer-icon';

      let answerText = answer.text;
      let className = 'neutral';
      let iconContent = String.fromCharCode(65 + index); // A, B, C, D

      if (answer.text === userAnswer.correctAnswer.text) {
        className = 'correct';
        iconContent = '✓';
        answerEl.setAttribute('aria-label', `Respuesta correcta: ${answer.text}`);
      } else if (answer.text === userAnswer.selectedAnswer.text && !userAnswer.isCorrect) {
        className = 'user-incorrect';
        iconContent = '✗';
        answerEl.setAttribute('aria-label', `Tu respuesta incorrecta: ${answer.text}`);
      } else {
        answerEl.setAttribute('aria-label', `Opción: ${answer.text}`);
      }

      answerIcon.textContent = iconContent;
      answerEl.classList.add(className);

      // Answer text content
      const answerContent = document.createElement('span');
      answerContent.className = 'answer-content';
      answerContent.textContent = answerText;

      answerEl.appendChild(answerIcon);
      answerEl.appendChild(answerContent);
      answersContainer.appendChild(answerEl);
    });

    // Question Summary
    const questionSummary = document.createElement('div');
    questionSummary.className = `question-summary ${userAnswer.isCorrect ? 'correct' : 'incorrect'}`;

    const summaryIcon = document.createElement('i');
    summaryIcon.className = `summary-icon bi ${userAnswer.isCorrect ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`;
    summaryIcon.setAttribute('aria-hidden', 'true');

    const summaryText = document.createElement('span');
    if (userAnswer.isCorrect) {
      summaryText.textContent = '¡Respuesta correcta!';
    } else {
      summaryText.textContent = `Respuesta incorrecta. La correcta era: ${userAnswer.correctAnswer.text}`;
    }

    questionSummary.appendChild(summaryIcon);
    questionSummary.appendChild(summaryText);

    // Assemble the complete item
    item.appendChild(questionHeader);
    item.appendChild(answersContainer);
    item.appendChild(questionSummary);

    return item;
  }

  // ===================================
  // STATISTICS MANAGEMENT
  // ===================================

  /**
   * Save game statistics
   */
  saveGameStats(correctAnswers, totalQuestions, percentage) {
    const gameData = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      score: percentage,
      correctAnswers: correctAnswers,
      totalQuestions: totalQuestions,
      duration: this.calculateQuizDuration(),
      answers: this.state.userAnswers.map(answer => ({
        question: answer.question.text,
        selected: answer.selectedAnswer.text,
        correct: answer.correctAnswer.text,
        isCorrect: answer.isCorrect
      }))
    };

    try {
      let stats = this.getStoredStats();
      stats.games.push(gameData);

      // Keep only the most recent games
      if (stats.games.length > this.CONFIG.MAX_STORED_GAMES) {
        stats.games = stats.games.slice(-this.CONFIG.MAX_STORED_GAMES);
      }

      this.saveStats(stats);
    } catch (error) {
      console.error('Error saving game stats:', error);
    }
  }

  /**
   * Calculate quiz duration in seconds
   */
  calculateQuizDuration() {
    if (!this.state.quizStartTime) return 0;
    return Math.round((new Date() - this.state.quizStartTime) / 1000);
  }

  /**
   * Get stored statistics
   */
  getStoredStats() {
    try {
      const stored = localStorage.getItem(this.CONFIG.STORAGE_KEY);
      if (stored) {
        const stats = JSON.parse(stored);
        return { games: Array.isArray(stats.games) ? stats.games : [] };
      }
    } catch (error) {
      console.error('Error parsing stored stats:', error);
    }

    return { games: [] };
  }

  /**
   * Save statistics to localStorage
   */
  saveStats(stats) {
    try {
      localStorage.setItem(this.CONFIG.STORAGE_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error('Error saving stats:', error);
      // Handle quota exceeded or other storage errors
      if (error.name === 'QuotaExceededError') {
        this.handleStorageQuotaExceeded();
      }
    }
  }

  /**
   * Handle storage quota exceeded
   */
  handleStorageQuotaExceeded() {
    try {
      // Keep only the most recent 20 games
      const stats = this.getStoredStats();
      stats.games = stats.games.slice(-20);
      localStorage.setItem(this.CONFIG.STORAGE_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error('Unable to clean up storage:', error);
    }
  }

  /**
   * Display statistics
   */
  displayStats() {
    const stats = this.getStoredStats();
    const games = stats.games;

    if (games.length === 0) {
      this.showEmptyStats();
      return;
    }

    // Calculate statistics
    const calculations = this.calculateStatistics(games);

    // Update display
    this.elements.totalGames.textContent = calculations.totalGames;
    this.elements.avgScore.textContent = `${calculations.avgScore}%`;
    this.elements.bestScore.textContent = `${calculations.bestScore}%`;
    this.elements.totalCorrect.textContent = calculations.totalCorrect;

    // Show games history
    this.displayGamesHistory(games);
  }

  /**
   * Calculate statistics from games data
   */
  calculateStatistics(games) {
    const totalGames = games.length;
    const totalCorrect = games.reduce((sum, game) => sum + (game.correctAnswers || 0), 0);
    const avgScore = totalGames > 0 ? Math.round(games.reduce((sum, game) => sum + (game.score || 0), 0) / totalGames) : 0;
    const bestScore = totalGames > 0 ? Math.max(...games.map(game => game.score || 0)) : 0;

    return {
      totalGames,
      totalCorrect,
      avgScore,
      bestScore
    };
  }

  /**
   * Display games history
   */
  displayGamesHistory(games) {
    this.elements.gamesList.innerHTML = '';

    // Show most recent games first (limit to 20)
    const recentGames = [...games].reverse().slice(0, 20);

    if (recentGames.length === 0) {
      this.showEmptyGamesList();
      return;
    }

    recentGames.forEach((game, index) => {
      const gameItem = this.createGameItem(game, index);
      this.elements.gamesList.appendChild(gameItem);
    });
  }

  /**
   * Create a game item element
   */
  createGameItem(game, index) {
    const item = document.createElement('article');
    item.className = 'game-item';
    item.setAttribute('aria-labelledby', `game-${index}-score`);

    const gameInfo = document.createElement('div');
    gameInfo.className = 'game-info';

    const dateEl = document.createElement('div');
    dateEl.className = 'game-date';
    dateEl.textContent = this.formatDate(game.date);

    const detailsEl = document.createElement('div');
    detailsEl.className = 'game-details';
    detailsEl.textContent = `${game.correctAnswers || 0}/${game.totalQuestions || this.CONFIG.TOTAL_QUESTIONS} correctas`;

    if (game.duration) {
      detailsEl.textContent += ` • ${this.formatDuration(game.duration)}`;
    }

    const scoreEl = document.createElement('div');
    scoreEl.id = `game-${index}-score`;
    scoreEl.className = `game-score ${this.getScoreClass(game.score || 0)}`;
    scoreEl.textContent = `${game.score || 0}%`;
    scoreEl.setAttribute('aria-label', `Puntuación: ${game.score || 0} por ciento`);

    gameInfo.appendChild(dateEl);
    gameInfo.appendChild(detailsEl);

    item.appendChild(gameInfo);
    item.appendChild(scoreEl);

    return item;
  }

  /**
   * Get score class based on percentage
   */
  getScoreClass(percentage) {
    if (percentage >= 90) return 'excellent';
    if (percentage >= 70) return 'good';
    if (percentage >= 50) return 'fair';
    return 'poor';
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) return 'Hoy';
      if (diffDays === 2) return 'Ayer';
      if (diffDays <= 7) return `Hace ${diffDays - 1} días`;

      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  /**
   * Format duration for display
   */
  formatDuration(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
  }

  /**
   * Show empty statistics state
   */
  showEmptyStats() {
    this.elements.totalGames.textContent = '0';
    this.elements.avgScore.textContent = '0%';
    this.elements.bestScore.textContent = '0%';
    this.elements.totalCorrect.textContent = '0';

    this.showEmptyGamesList();
  }

  /**
   * Show empty games list
   */
  showEmptyGamesList() {
    this.elements.gamesList.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-graph-up" aria-hidden="true"></i>
        <h4>No hay partidas registradas</h4>
        <p>Juega tu primer quiz para ver tus estadísticas aquí</p>
      </div>
    `;
  }

  // ===================================
  // UTILITY METHODS - IMPROVED
  // ===================================

  /**
   * Restart the quiz
   */
  restartQuiz() {
    this.resetQuiz();
    this.startQuiz();
  }

  /**
   * Close modal and show main menu
   */
  closeModalAndShowMenu() {
    this.state.isQuizActive = false;
    this.elements.quizModal.hide();
    this.showMainMenu();
  }

  /**
   * Reset quiz completely - IMPROVED
   */
  resetQuiz() {
    this.resetQuizState();
    this.state.isQuizActive = false;

    // Reset DOM elements
    if (this.elements.answersContainer) {
      this.elements.answersContainer.innerHTML = '';
    }

    // Ensure feedback and countdown are properly hidden but reserve space
    if (this.elements.feedback) {
      this.elements.feedback.classList.add('d-none');
      this.elements.feedback.innerHTML = '';
      this.elements.feedback.classList.remove('alert-success', 'alert-danger');
    }

    if (this.elements.countdownContainer) {
      this.elements.countdownContainer.classList.add('d-none');
    }

    // Reset countdown bar
    if (this.elements.countdownBar) {
      this.elements.countdownBar.style.transition = 'none';
      this.elements.countdownBar.style.width = '0%';
      this.elements.countdownBar.classList.remove('animate');
    }

    if (this.elements.quizProgress) {
      this.elements.quizProgress.style.width = '0%';
    }
  }

  /**
   * Handle errors gracefully
   */
  handleError(message, error) {
    console.error(message, error);

    // Show user-friendly error message
    const errorMessage = this.getUserFriendlyErrorMessage(error);

    // You could implement a more sophisticated error display here
    alert(`${message}: ${errorMessage}`);
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyErrorMessage(error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'No se pudo cargar el contenido. Verifica tu conexión a internet.';
    }

    if (error.message.includes('questions')) {
      return 'Error al cargar las preguntas. Por favor, recarga la página.';
    }

    return 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.';
  }
}

// ===================================
// APPLICATION INITIALIZATION
// ===================================

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  try {
    new QuizApp();
  } catch (error) {
    console.error('Failed to initialize Quiz App:', error);

    // Show fallback error message
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.innerHTML = `
        <div class="preloader-content">
          <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
          <h4>Error al cargar la aplicación</h4>
          <p>Por favor, recarga la página para intentar de nuevo.</p>
          <button class="btn btn-primary mt-3" onclick="window.location.reload()">
            Recargar página
          </button>
        </div>
      `;
    }
  }
});

// ===================================
// SERVICE WORKER REGISTRATION
// ===================================

/**
 * Register service worker for offline functionality (optional)
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}