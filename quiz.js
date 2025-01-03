class Quiz {
    constructor() {
        this.questions = [];
        this.selectedQuestions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.timer = null;
        this.timeLeft = 0;
        this.correctlyAnsweredQuestions = new Set(); // Menyimpan indeks soal yang dijawab benar

        // Elements
        this.questionCountSelect = document.getElementById('question-count');
        this.startButton = document.getElementById('start-quiz');
        this.quizIntro = document.getElementById('quiz-intro');
        this.quizArea = document.getElementById('quiz-area');
        this.questionList = document.getElementById('question-list');
        this.questionText = document.getElementById('question-text');
        this.optionsContainer = document.getElementById('options-container');
        this.questionNumber = document.getElementById('question-number');
        this.timerElement = document.getElementById('timer');
        this.nextButton = document.getElementById('next-btn');
        this.prevButton = document.getElementById('prev-btn');
        this.submitButton = document.getElementById('submit-btn');
        this.resultArea = document.getElementById('result-area');
        this.scoreSummary = document.getElementById('score-summary');
        this.detailedResults = document.getElementById('detailed-results');
        this.restartButton = document.getElementById('restart-quiz');
        this.restartButton.addEventListener('click', () => this.restartQuiz());
        this.questionStartTime = 0;
        this.questionDurations = [];

        // Event listeners untuk tombol navigasi
        this.nextButton.addEventListener('click', () => this.nextQuestion());
        this.prevButton.addEventListener('click', () => this.prevQuestion());
        this.submitButton.addEventListener('click', () => this.finishQuiz());

        this.userAnswers = [];

        // Data untuk performa seiring waktu
        this.performanceData = this.loadPerformanceData();

        this.initializeQuiz();
    }

    async initializeQuiz() {
        try {
            await this.loadQuestions();
            this.setupQuestionCountOptions();
            this.addEventListeners();
        } catch (error) {
            console.error('Error initializing quiz:', error);
        }
    }

    async loadQuestions() {
        try {
            const response = await fetch('AGAMA.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.questions || !Array.isArray(data.questions)) {
                throw new Error('Format data soal tidak valid');
            }
            
            this.questions = data.questions;
            console.log(`Berhasil memuat ${this.questions.length} soal`);
        } catch (error) {
            console.error('Error loading questions:', error);
            alert('Gagal memuat soal: ' + error.message);
        }
    }

    setupQuestionCountOptions() {
        // Bersihkan opsi yang ada
        this.questionCountSelect.innerHTML = '';
        
        // Tentukan increment dan maksimum jumlah soal
        const totalQuestions = this.questions.length;
        const answeredCorrectly = this.correctlyAnsweredQuestions.size;
        const availableQuestions = totalQuestions - answeredCorrectly;

        // Tentukan increment berdasarkan yang tersedia
        const increments = [5, 10, 15, 20, 25, 30, 40, 50].filter(num => num <= availableQuestions);
        
        // Tambahkan opsi berdasarkan jumlah soal yang tersedia
        increments.forEach(num => {
            const option = document.createElement('option');
            option.value = num;
            option.textContent = `${num} Soal`;
            this.questionCountSelect.appendChild(option);
        });

        // Jika jumlah soal tidak sesuai dengan increment, tambahkan sebagai opsi terakhir
        if (!increments.includes(availableQuestions) && availableQuestions > 0) {
            const option = document.createElement('option');
            option.value = availableQuestions;
            option.textContent = `${availableQuestions} Soal`;
            this.questionCountSelect.appendChild(option);
        }

        // Jika tidak ada soal yang tersisa
        if (availableQuestions === 0) {
            const option = document.createElement('option');
            option.value = 0;
            option.textContent = `0 Soal Tersisa`;
            this.questionCountSelect.appendChild(option);
            this.startButton.disabled = true;
            this.startButton.textContent = 'Semua soal telah dijawab dengan benar';
        } else {
            this.startButton.disabled = false;
            this.startButton.textContent = 'Mulai Kuis';
        }

        console.log(`Opsi jumlah soal telah diperbarui. Soal tersisa: ${availableQuestions}`);
    }

    addEventListeners() {
        // Event listener untuk select box
        this.questionCountSelect.addEventListener('change', (e) => {
            console.log(`Jumlah soal dipilih: ${e.target.value}`);
        });

        // Event listener untuk tombol mulai
        this.startButton.addEventListener('click', () => {
            const selectedCount = parseInt(this.questionCountSelect.value);
            this.startQuiz(selectedCount);
        });
    }

    startQuiz(questionCount) {
        // Validasi jumlah soal
        if (!questionCount || questionCount <= 0) {
            alert('Tidak ada soal yang tersisa untuk dijawab.');
            return;
        }

        const totalQuestions = this.questions.length;
        const totalCorrect = this.correctlyAnsweredQuestions.size;
        const availableQuestions = totalQuestions - totalCorrect;

        // Cek apakah jumlah soal yang dipilih melebihi yang tersedia
        if (questionCount > availableQuestions) {
            alert(`Jumlah soal yang dipilih melebihi jumlah soal yang tersedia (${availableQuestions} soal tersisa).`);
            this.questionCountSelect.value = availableQuestions;
            return;
        }

        // Hitung jumlah soal yang akan dipilih dari availableQuestions
        const questionsToSelect = questionCount;

        // Acak dan pilih soal sesuai jumlah yang diminta
        const newSelectedQuestions = this.shuffleQuestions(questionsToSelect);
        this.selectedQuestions = newSelectedQuestions;
        
        this.currentQuestionIndex = 0;
        
        // Sembunyikan intro dan tampilkan area kuis
        this.quizIntro.style.display = 'none';
        this.quizArea.style.display = 'flex';

        // Setup navigasi soal di sidebar
        this.setupQuestionNavigation();
        
        // Set waktu 1 menit per soal
        this.timeLeft = this.selectedQuestions.length * 60; // 60 detik per soal
        this.startTimer();
        
        // Tampilkan soal pertama
        this.displayQuestion();

        console.log('Kuis dimulai dengan', this.selectedQuestions.length, 'soal');
    }

    shuffleQuestions(count) {
        // Filter keluar soal yang sudah dijawab benar
        const availableQuestions = this.questions.filter((_, index) => !this.correctlyAnsweredQuestions.has(index));
        
        if (availableQuestions.length === 0) {
            alert('Selamat! Anda telah menjawab semua soal dengan benar.');
            return [];
        }
        
        // Acak soal dan ambil sejumlah yang diminta
        const shuffled = availableQuestions.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    setupQuestionNavigation() {
        this.questionList.innerHTML = '';
        this.selectedQuestions.forEach((_, index) => {
            const question = this.selectedQuestions[index];
            const globalIndex = this.questions.indexOf(question);
            const button = document.createElement('button');
            button.className = 'question-nav-item';
            button.textContent = `Soal ${index + 1}`;
            
            // Tandai jika soal ini sudah pernah dijawab benar
            if (this.correctlyAnsweredQuestions.has(globalIndex)) {
                button.classList.add('already-correct');
                button.disabled = true; // Nonaktifkan klik pada soal yang sudah benar
            } else {
                button.addEventListener('click', () => this.jumpToQuestion(index));
            }
            this.questionList.appendChild(button);
        });
    }

    displayQuestion() {
        const question = this.selectedQuestions[this.currentQuestionIndex];
        this.questionNumber.textContent = `Soal ${this.currentQuestionIndex + 1}`;
        this.questionText.textContent = question.question;
        
        // Tampilkan opsi jawaban
        this.optionsContainer.innerHTML = '';
        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'option-button';
            button.textContent = option;
            button.addEventListener('click', () => this.selectAnswer(index));
            this.optionsContainer.appendChild(button);
        });

        // Tampilkan jawaban jika sudah pernah dijawab
        const userAnswerIndex = this.userAnswers[this.currentQuestionIndex];
        if (userAnswerIndex !== undefined) {
            const buttons = this.optionsContainer.getElementsByClassName('option-button');
            Array.from(buttons).forEach((button, index) => {
                button.classList.toggle('selected', index === userAnswerIndex);
            });
        }

        // Update status tombol navigasi
        this.updateNavigationButtons();
        
        // Update navigasi sidebar
        this.updateQuestionNavigation();
        this.questionStartTime = Date.now();
    }

    updateQuestionNavigation() {
        const navButtons = this.questionList.getElementsByClassName('question-nav-item');
        Array.from(navButtons).forEach((button, index) => {
            button.classList.toggle('active', index === this.currentQuestionIndex);
        });
    }

    jumpToQuestion(index) {
        if (index >= 0 && index < this.selectedQuestions.length) {
            this.currentQuestionIndex = index;
            this.displayQuestion();
        }
    }

    selectAnswer(optionIndex) {
        const duration = (Date.now() - this.questionStartTime) / 1000;
        this.questionDurations[this.currentQuestionIndex] = duration;
        
        // Simpan jawaban user
        this.userAnswers[this.currentQuestionIndex] = optionIndex;
        
        // Update tampilan tombol
        const buttons = this.optionsContainer.getElementsByClassName('option-button');
        Array.from(buttons).forEach((button, index) => {
            button.classList.toggle('selected', index === optionIndex);
        });

        // Update status soal di sidebar
        this.updateQuestionStatus(this.currentQuestionIndex, true);
    }

    updateQuestionStatus(index, answered) {
        const navButtons = this.questionList.getElementsByClassName('question-nav-item');
        if (answered) {
            navButtons[index].classList.add('answered');
        }
        
        // Jika soal ini sudah dijawab benar, tambahkan kelas 'already-correct'
        const question = this.selectedQuestions[index];
        const globalIndex = this.questions.indexOf(question);
        if (this.correctlyAnsweredQuestions.has(globalIndex)) {
            navButtons[index].classList.add('already-correct');
            navButtons[index].disabled = true; // Nonaktifkan klik
        }
    }

    startTimer() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.updateTimerDisplay();
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();

            if (this.timeLeft <= 0) {
                this.endQuiz();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // Warna merah jika waktu < 20% tersisa
        if (this.timeLeft < (this.selectedQuestions.length * 60 * 0.2)) {
            this.timerElement.style.color = '#dc3545';
        } else {
            this.timerElement.style.color = ''; // Reset warna
        }
    }

    endQuiz() {
        clearInterval(this.timer);
        // Implementasi logika ketika waktu habis
        alert('Waktu telah habis!');
        this.finishQuiz(); // Otomatis menyelesaikan kuis
    }

    showResults() {
        // Sembunyikan area kuis
        this.quizArea.style.display = 'none';
        
        // Tampilkan area hasil
        this.resultArea.style.display = 'block';
        
        // Hitung dan tampilkan skor
        const totalQuestions = this.selectedQuestions.length;
        const percentage = (this.score / totalQuestions) * 100;
        
        this.scoreSummary.innerHTML = `
            <h3>Ringkasan Hasil</h3>
            <p>Jawaban Benar: ${this.score} dari ${totalQuestions}</p>
            <p>Nilai: ${percentage.toFixed(2)}%</p>
        `;

        // Tampilkan detail jawaban
        this.detailedResults.innerHTML = '<h3>Detail Jawaban</h3>';
        this.selectedQuestions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index] !== undefined ? 
                question.options[this.userAnswers[index]] : 'Tidak dijawab';
            const isCorrect = userAnswer === question.correct;
            
            // Jika jawaban benar, tambahkan ke correctlyAnsweredQuestions
            if (isCorrect) {
                const globalIndex = this.questions.indexOf(question);
                this.correctlyAnsweredQuestions.add(globalIndex);
            }

            this.detailedResults.innerHTML += `
                <div class="result-item ${isCorrect ? 'correct' : 'incorrect'}">
                    <p><strong>Soal ${index + 1}:</strong> ${question.question}</p>
                    <p>Jawaban Anda: ${userAnswer}</p>
                    <p>Jawaban Benar: ${question.correct}</p>
                </div>
            `;
        });

        // Tambahkan section untuk durasi dan grafik
        this.detailedResults.innerHTML += `
            <div class="duration-section">
                <h3>Durasi Pengerjaan per Soal</h3>
                <div class="duration-chart">
                    <canvas id="durationChart"></canvas>
                </div>
                <div class="duration-list">
                    ${this.questionDurations.map((duration, index) => `
                        <div class="duration-item">
                            <span>Soal ${index + 1}:</span>
                            <span>${duration.toFixed(1)} detik</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Buat grafik durasi menggunakan Chart.js
        this.createDurationChart();

        // Hitung dan tampilkan statistik waktu pengerjaan
        this.displayTimeStatistics();

        // Simpan performa kuis saat ini
        this.saveCurrentPerformance();

        // Tampilkan grafik performa seiring waktu
        this.displayPerformanceChart();

        // Update question count options untuk kuis selanjutnya
        this.setupQuestionCountOptions();
    }

    createDurationChart() {
        const ctx = document.getElementById('durationChart').getContext('2d');
        
        // Tentukan warna berdasarkan jawaban benar/salah
        const barColors = this.questionDurations.map((_, index) => {
            const userAnswer = this.userAnswers[index] !== undefined ? 
                this.selectedQuestions[index].options[this.userAnswers[index]] : 'Tidak dijawab';
            const isCorrect = userAnswer === this.selectedQuestions[index].correct;
            return isCorrect ? '#4A90E2' : '#FFD700'; // Biru untuk benar, Kuning untuk salah
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.questionDurations.map((_, i) => `Soal ${i + 1}`),
                datasets: [{
                    label: 'Durasi (detik)',
                    data: this.questionDurations,
                    backgroundColor: barColors,
                    borderColor: barColors.map(color => 
                        color === '#4A90E2' ? '#357ABD' : '#DAA520'
                    ),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Waktu (detik)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // Menampilkan Statistik Waktu Pengerjaan
    displayTimeStatistics() {
        const averageTime = this.calculateAverageTime();
        const fastest = this.findFastestQuestion();
        const slowest = this.findSlowestQuestion();

        document.getElementById('average-time').textContent = averageTime.toFixed(1);
        document.getElementById('fastest-question').textContent = fastest.questionNumber;
        document.getElementById('fastest-time').textContent = fastest.time.toFixed(1);
        document.getElementById('slowest-question').textContent = slowest.questionNumber;
        document.getElementById('slowest-time').textContent = slowest.time.toFixed(1);
    }

    calculateAverageTime() {
        const totalTime = this.questionDurations.reduce((acc, curr) => acc + curr, 0);
        return totalTime / this.questionDurations.length || 0;
    }

    findFastestQuestion() {
        let minTime = Infinity;
        let questionNumber = -1;
        this.questionDurations.forEach((time, index) => {
            if (time < minTime) {
                minTime = time;
                questionNumber = index + 1;
            }
        });
        return { questionNumber, time: minTime };
    }

    findSlowestQuestion() {
        let maxTime = -Infinity;
        let questionNumber = -1;
        this.questionDurations.forEach((time, index) => {
            if (time > maxTime) {
                maxTime = time;
                questionNumber = index + 1;
            }
        });
        return { questionNumber, time: maxTime };
    }

    // Menyimpan performa kuis saat ini ke localStorage
    saveCurrentPerformance() {
        const currentPerformance = {
            date: new Date().toLocaleString(),
            score: this.score,
            totalQuestions: this.selectedQuestions.length,
            percentage: (this.score / this.selectedQuestions.length) * 100 // Menambahkan persentase
        };
        this.performanceData.push(currentPerformance);
        localStorage.setItem('performanceData', JSON.stringify(this.performanceData));
    }

    // Memuat data performa dari localStorage
    loadPerformanceData() {
        const data = localStorage.getItem('performanceData');
        return data ? JSON.parse(data) : [];
    }

    // Menampilkan Grafik Performa Seiring Waktu
    displayPerformanceChart() {
        const ctx = document.getElementById('performanceChart').getContext('2d');

        // Jika sudah ada grafik sebelumnya, hapus terlebih dahulu
        if (this.performanceChart) {
            this.performanceChart.destroy();
        }

        // Persiapkan data untuk grafik menggunakan persentase
        const labels = this.performanceData.map(entry => {
            const date = new Date(entry.date);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        });
        const percentages = this.performanceData.map(entry => entry.percentage);

        this.performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Skor (%)',
                    data: percentages,
                    fill: false,
                    borderColor: '#4A90E2',
                    backgroundColor: '#4A90E2',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100, // Maksimum 100% untuk sumbu Y
                        title: {
                            display: true,
                            text: 'Persentase Skor (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Kuis'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Skor: ${context.parsed.y.toFixed(2)}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Menyimpan data performa kuis ke localStorage
    cleanup() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.selectedQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
        }
    }

    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
        }
    }

    updateNavigationButtons() {
        // Tampilkan/sembunyikan tombol Sebelumnya
        this.prevButton.style.display = this.currentQuestionIndex > 0 ? 'inline-block' : 'none';
        
        // Tampilkan/sembunyikan tombol Selanjutnya dan Selesai
        if (this.currentQuestionIndex === this.selectedQuestions.length - 1) {
            this.nextButton.style.display = 'none';
            this.submitButton.style.display = 'inline-block';
        } else {
            this.nextButton.style.display = 'inline-block';
            this.submitButton.style.display = 'none';
        }
    }

    finishQuiz() {
        clearInterval(this.timer);
        this.calculateScore();
        this.showResults();
    }

    calculateScore() {
        this.score = 0;
        this.userAnswers.forEach((answer, index) => {
            const question = this.selectedQuestions[index];
            if (answer !== undefined && question.options[answer] === question.correct) {
                this.score++;
                const globalIndex = this.questions.indexOf(question);
                this.correctlyAnsweredQuestions.add(globalIndex);
            }
        });
    }

    restartQuiz() {
        // Reset semua state kecuali correctlyAnsweredQuestions
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];
        this.timeLeft = 0;
        this.questionDurations = [];
        
        // Reset tampilan
        this.resultArea.style.display = 'none';
        this.quizArea.style.display = 'none';
        this.quizIntro.style.display = 'block';
        
        // Reset timer
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        // Reset navigasi soal di sidebar jika diperlukan
        this.questionList.innerHTML = '';
        
        // Tampilkan ulang intro quiz
        this.quizIntro.style.display = 'block';

        // Update question count options berdasarkan sisa soal
        this.setupQuestionCountOptions();
    }
}

// Inisialisasi quiz setelah DOM dimuat
document.addEventListener('DOMContentLoaded', () => {
    const quiz = new Quiz();
});
