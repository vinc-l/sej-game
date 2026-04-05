import { quizData } from './data.js';

const choicesContainer = document.getElementById('choicesContainer');
const questionText = document.querySelector('.question');
const questionTypeTag = document.querySelector('.question-type');
const timerBar = document.getElementById('timerBar');
const submitBtn = document.getElementById('submitBtn');

let currentQuestion = null;
let timeLeft = 100;
const interval = 100;
let timerUpdate;

let wordleRowIndex = 0;
let wordleColIndex = 0;
let currentGuess = "";

/* SCORING SYSTEM */
function getScore(type, difficulty) {
    const rules = {
        "PG":           { EZ: 2,  Mid: 4,  HARD: 6 },
        "TF":           { EZ: 2,  Mid: 4,  HARD: 6 },
        "PG+":          { EZ: 6,  Mid: 8,  HARD: 10 },
        "Isian":        { EZ: 8,  Mid: 10, HARD: 12 },
        "Isian Insane": { EZ: 10, Mid: 12, HARD: 15 },
        "Wordle":       { EZ: 5,  Mid: 8,  HARD: 10 }
    };

    const points = rules[type]?.[difficulty] || 2;
    const penalty = Math.ceil(points / 2); 

    return { points, penalty };
}

/* SHUFFLE ARRAY */
const shuffle = (array) => array.sort(() => Math.random() - 0.5);

/* FILTER QUESTION BASED ON ID */
function initQuiz() {
    const section = document.querySelector('section');
    const pageId = section.id;

    let filteredData = [];
    
    if (pageId === "MCQ") {
        filteredData = quizData.filter(q => q.type === "PG" || q.type === "PG+");
    } else if (pageId === "Isian") {
        filteredData = quizData.filter(q => q.type === "Isian" || q.type === "Isian Insane");
    } else if (pageId === "Wordle") {
        filteredData = quizData.filter(q => q.type === "Wordle");
    } else if (pageId === "TrueFalse") {
        filteredData = quizData.filter(q => q.type === "TF");
    } else if (pageId === "Random") {
        filteredData = quizData;
    }

    if (filteredData.length > 0) {
        currentQuestion = filteredData[Math.floor(Math.random() * filteredData.length)];
        renderQuestion(currentQuestion);
        const durations = {
            "PG": 30000,
            "PG+": 45000,
            "TF": 30000,
            "Isian": 55000,
            "Isian Insane": 65000,
            "Wordle": 60000
        };

        const selectedDuration = durations[currentQuestion.type] || 30000;
        startTimer(selectedDuration);
    } else {
        questionText.innerText = "Tidak ada pertanyaan untuk kategori ini.";
        submitBtn.style.display = "none";
    }
}

/* RENDER */
function renderQuestion(data) {
    questionText.innerText = data.question;
    choicesContainer.innerHTML = '';

    // IMAGE
    const imageContainer = document.getElementById('imageContainer');
    imageContainer.innerHTML = '';

    if (data.image) {
        const img = document.createElement('img');
        img.src = data.image;
        img.className = 'question-img';
        imageContainer.appendChild(img);
    }
    
    // HEADER
    const diffTag = document.querySelector('.question-difficulty');
    questionTypeTag.innerText = data.type;
    diffTag.innerText = data.difficulty;

    diffTag.className = 'question-difficulty';
    if (data.difficulty === "EZ") {
        diffTag.classList.add('diff-ez');
    } else if (data.difficulty === "Mid") {
        diffTag.classList.add('diff-mid');
    } else if (data.difficulty === "HARD") {
        diffTag.classList.add('diff-hard');
    }

    if (data.type === "PG" || data.type === "PG+") {
        const choices = shuffle([...data.choices]);
        choices.forEach(choice => {
            const div = document.createElement('div');
            div.className = 'button choice';
            div.innerText = choice;
            div.onclick = () => {
                if (data.type === "PG") {
                    document.querySelectorAll('.choice').forEach(c => c.classList.remove('active'));
                    div.classList.add('active');
                } else {
                    div.classList.toggle('active');
                }
            };
            choicesContainer.appendChild(div);
        });
    } 
    
    else if (data.type.includes("Isian")) {
        const hasBlanks = data.question.includes("__");

        if (hasBlanks) {
            let questionHtml = data.question;
            const blankRegex = /_{2,}/g;
            let blankIndex = 0;

            questionHtml = questionHtml.replace(blankRegex, () => {
                return `<span class="blank-space" data-index="${blankIndex++}">____</span>`;
            });

            questionText.innerHTML = questionHtml;

            const input = document.createElement('input');
            input.type = "text";
            input.className = "input-field smart-input";
            input.placeholder = "Ketik kata lalu tekan Spasi...";
            input.addEventListener('keydown', handleSmartInput);
            choicesContainer.appendChild(input);
        } else {
            questionText.innerText = data.question;
            data.answer.forEach((ans, idx) => {
                const input = document.createElement('input');
                input.type = "text";
                input.className = "input-field multi-input";
                input.placeholder = `Ketik jawaban disini...`;
                choicesContainer.appendChild(input);
            });
        }
    }

    else if (data.type === "Wordle") {
        const word = data.answer[0].toUpperCase();
        const wordLength = word.length;
        const grid = document.createElement('div');
        grid.className = 'wordle-grid';
        grid.style.gridTemplateColumns = `repeat(${wordLength}, 50px)`;
        grid.id = "wordleGrid";

        for (let i = 0; i < 6 * wordLength; i++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${i}`;
            grid.appendChild(tile);
        }
        choicesContainer.appendChild(grid);

        window.addEventListener('keydown', handleKeyDown);
    } 

    else if (data.type === "TF") {
        const tfContainer = document.createElement('div');
        tfContainer.className = 'tf-container';

        const options = [
            { id: 'trueBtn', icon: 'fa-check', value: 'Benar' },
            { id: 'falseBtn', icon: 'fa-xmark', value: 'Salah' }
        ];

        options.forEach(opt => {
            const div = document.createElement('div');
            div.className = 'tf-option choice';
            div.id = opt.id;
            div.dataset.value = opt.value;
            div.innerHTML = `<i class="fa-solid ${opt.icon}"></i>`;

            div.onclick = () => {
                document.querySelectorAll('.tf-option').forEach(c => c.classList.remove('active'));
                div.classList.add('active');
            };
            tfContainer.appendChild(div);
        });

        choicesContainer.appendChild(tfContainer);
    }
}

/* TIMER LOGIC */
function startTimer(duration) {
    let totalMs = duration;
    let elapsedMs = 0;
    
    const timerText = document.getElementById('timerText');
    const hourglass = document.getElementById('hourglass');
    
    hourglass.classList.add('spinning');

    timerUpdate = setInterval(() => {
        elapsedMs += interval;
        let percentage = ((totalMs - elapsedMs) / totalMs) * 100;
        let secondsLeft = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));

        timerBar.style.width = percentage + "%";
        timerText.innerText = secondsLeft + "s";

        if (elapsedMs >= totalMs) {
            clearInterval(timerUpdate);
            timerBar.style.width = "0%";
            timerText.innerText = "0s";
            hourglass.classList.remove('spinning');

            const { points, penalty } = getScore(currentQuestion.type, currentQuestion.difficulty);
            showFeedback(false, points, penalty, "Waktu Habis!");
        }
    }, interval);
}

/* FREEZE UI */
function freezeUI() {
    const inputs = document.querySelectorAll('.choice, .input-field, .tf-option, .tile');
    inputs.forEach(el => {
        el.style.pointerEvents = "none";
        if(el.tagName === 'INPUT') el.readOnly = true;
    });
    window.removeEventListener('keydown', handleKeyDown);
}

/* SHOW FEEDBACK */
function showFeedback(isCorrect, points, penalty, customMsg = null) {
    clearInterval(timerUpdate);
    document.getElementById('hourglass').classList.remove('spinning');

    if (isCorrect) {
        feedbackStatus.innerText = customMsg || "Benar!";
        feedbackPoints.innerText = `+${points} koin`;
        feedbackBar.className = 'feedback-bar show correct-bg';
        submitBtn.classList.add('correct-state');
    } else {
        feedbackStatus.innerText = customMsg || "Salah";
        feedbackPoints.innerText = `-${penalty} koin`;
        feedbackBar.className = 'feedback-bar show wrong-bg';
        submitBtn.classList.add('wrong-state');
    }

    submitBtn.innerText = "Periksa";
    freezeUI();
}

/* CHECK ANSWER */
submitBtn.addEventListener('click', () => {
    if (!currentQuestion || submitBtn.classList.contains('disabled')) return;

    // WORDLE
    if (currentQuestion.type === "Wordle") {
        const word = currentQuestion.answer[0].toUpperCase();
        if (currentGuess.length === word.length) {
            checkWordleRow();
        } else {
            alert("Kata belum lengkap!");
        }
        return;
    }

    const { points, penalty } = getScore(currentQuestion.type, currentQuestion.difficulty);
    let isCorrect = false;

    const selectedElements = Array.from(document.querySelectorAll('.choice.active'));
    const inputElements = Array.from(document.querySelectorAll('.input-field'));

    // TRUE FALSE
    if (currentQuestion.type === "TF") {
        const activeTF = document.querySelector('.tf-option.active');
        
        if (!activeTF) {
            alert("Pilih salah satu jawaban!");
            return;
        }
        
        const userChoice = activeTF.dataset.value; 
        isCorrect = userChoice.toLowerCase() === currentQuestion.answer.toLowerCase();

        activeTF.classList.add('finished');
        if (isCorrect) {
            activeTF.classList.add('correct');
        } else {
            activeTF.classList.add('wrong');
        }
    }

    // PG & PG+
    if (currentQuestion.type === "PG" || currentQuestion.type === "PG+") {
        const selectedValues = selectedElements.map(el => el.innerText.trim().toLowerCase());
        
        // FORCE SELECTION: If nothing is selected, alert and stop the function
        if (selectedValues.length === 0) {
            alert("Pilih setidaknya satu jawaban sebelum memeriksa!");
            return; 
        }

        const correctAnswers = Array.isArray(currentQuestion.answer) 
            ? currentQuestion.answer.map(a => a.toLowerCase()) 
            : [currentQuestion.answer.toLowerCase()];

        if (currentQuestion.type === "PG") {
            isCorrect = selectedValues[0] === correctAnswers[0];
        } else {
            isCorrect = correctAnswers.length === selectedValues.length && 
                        selectedValues.every(val => correctAnswers.includes(val));
        }
    }

    // ISIAN
    else if (currentQuestion.type.includes("Isian")) {
        const blanks = document.querySelectorAll('.blank-space');
        const multiInputs = document.querySelectorAll('.multi-input');
        
        let correctCount = 0;
        let totalItems = 0;

        if (blanks.length > 0) {
            totalItems = blanks.length;
            blanks.forEach((blank, idx) => {
                const userText = blank.innerText.trim().toLowerCase();
                const correctAnswer = currentQuestion.answer[idx].toLowerCase();
                
                if (userText === correctAnswer) {
                    blank.style.backgroundColor = "#e8f5e9";
                    correctCount++;
                } else {
                    blank.style.backgroundColor = "#ffebee";
                    // blank.innerText = currentQuestion.answer[idx]; // REMOVED: Don't show answer
                    blank.style.color = "red";
                }
            });
        } else {
            totalItems = multiInputs.length;
            const correctAnswers = currentQuestion.answer.map(a => a.toLowerCase());

            multiInputs.forEach((input, idx) => {
                const val = input.value.trim().toLowerCase();
                if (correctAnswers.includes(val) && val !== "") {
                    input.style.borderColor = "var(--green)";
                    input.style.backgroundColor = "#e8f5e9";
                    correctCount++;
                } else {
                    input.style.borderColor = "var(--red)";
                    input.style.backgroundColor = "#ffebee";
                    // input.value = `Salah! (${currentQuestion.answer[idx]})`; // REMOVED: Don't show answer
                }
            });
        }

        const maxPoints = points; 
        const earnedPoints = Math.floor((correctCount / totalItems) * maxPoints);
        
        isCorrect = (correctCount === totalItems);
        
        if (correctCount > 0 && correctCount < totalItems) {
            showFeedback(true, earnedPoints, 0, `Sebagian Benar! (${correctCount}/${totalItems})`);
        } else {
            showFeedback(isCorrect, isCorrect ? maxPoints : 0, penalty);
        }
    }

    submitBtn.classList.add('disabled');
    submitBtn.style.pointerEvents = "none";
    submitBtn.style.opacity = "0.7";

    clearInterval(timerUpdate);
    showFeedback(isCorrect, points, penalty);
    freezeUI();
});

initQuiz();

/* WORDLE LOGIC */
function handleKeyDown(e) {
    if (!currentQuestion || currentQuestion.type !== "Wordle") return;
    
    const word = currentQuestion.answer[0].toUpperCase();
    const len = word.length;

    if (e.key === "Enter") {
        if (currentGuess.length === len) checkWordleRow();
    } else if (e.key === "Backspace") {
        if (currentGuess.length > 0) {
            currentGuess = currentGuess.slice(0, -1);
            wordleColIndex--;
            updateGrid();
        }
    } else if (currentGuess.length < len && /^[a-zA-Z]$/.test(e.key)) {
        currentGuess += e.key.toUpperCase();
        updateGrid();
        wordleColIndex++;
    }
}

function updateGrid() {
    const wordLength = currentQuestion.answer[0].length;
    const allTilesInRow = Array.from({length: wordLength}, (_, i) => 
        document.getElementById(`tile-${i + (wordleRowIndex * wordLength)}`)
    );

    allTilesInRow.forEach((tile, i) => {
        const char = currentGuess[i] || "";
        if (tile.innerText !== char && char !== "") {
            tile.classList.add('pop');
            setTimeout(() => tile.classList.remove('pop'), 100);
        }
        tile.innerText = char;
        tile.classList.toggle('active-input', i === currentGuess.length);
    });
}

function checkWordleRow() {
    const target = currentQuestion.answer[0].toUpperCase();
    const guess = currentGuess;
    const wordLength = target.length;
    let correctCount = 0;

    for (let i = 0; i < wordLength; i++) {
        const tile = document.getElementById(`tile-${i + (wordleRowIndex * wordLength)}`);
        
        if (guess[i] === target[i]) {
            correctCount++;
        }

        setTimeout(() => {
            tile.classList.add('flip');
            
            setTimeout(() => {
                if (guess[i] === target[i]) {
                    tile.classList.add('correct');
                } else if (target.includes(guess[i])) {
                    tile.classList.add('present');
                } else {
                    tile.classList.add('absent');
                }
            }, 300);
        }, i * 100); 
    }

    const animationDelay = (wordLength * 100) + 400; 

    setTimeout(() => {
        if (correctCount === wordLength) {
            finishWordle(true);
        } else if (wordleRowIndex === 5) {
            finishWordle(false);
        } else {
            wordleRowIndex++;
            wordleColIndex = 0;
            currentGuess = "";
        }
    }, animationDelay);
}

function finishWordle(isCorrect) {
    window.removeEventListener('keydown', handleKeyDown);
    const { points, penalty } = getScore(currentQuestion.type, currentQuestion.difficulty);
    showFeedback(isCorrect, points, penalty);
}

function handleSmartInput(e) {
    if (e.key === " " || e.key === "Enter") {
        e.preventDefault(); 
        
        const input = e.target;
        const typedValue = input.value.trim().toLowerCase();
        if (!typedValue) return;

        const correctAnswers = currentQuestion.answer.map(a => a.toLowerCase());
        const blanks = document.querySelectorAll('.blank-space');
        
        let matchFound = false;

        blanks.forEach((blank, idx) => {
            const correctAnswer = correctAnswers[idx];
            
            if (typedValue === correctAnswer && blank.innerText.includes('_')) {
                blank.innerText = currentQuestion.answer[idx];
                blank.classList.add('filled');
                matchFound = true;
                
                blank.style.color = "var(--green)";
                setTimeout(() => blank.style.color = "", 500);
            }
        });

        if (matchFound) {
            input.value = ""; 
            
            // --- LOGIKA AUTO-CHECK ---
            // Cek apakah semua blank sudah memiliki class 'filled'
            const allFilled = Array.from(blanks).every(b => b.classList.contains('filled'));
            
            if (allFilled) {
                // Beri sedikit delay (misal 300ms) agar user bisa melihat kata terakhir terisi
                setTimeout(() => {
                    submitBtn.click();
                }, 300);
            }
        } else {
            input.classList.add('shake');
            setTimeout(() => input.classList.remove('shake'), 500);
        }
    }
}