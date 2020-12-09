interface ActionInput {
  xIndex: number;
  yIndex: number;
  action: string;  
};

class Minesweeper {
  gridX: number;
  gridY: number;
  bombs: number;
  flags: number;
  grid: Array<Array<string>>;
  userGrid: Array<Array<string>>;

  readonly ICON_EMPTY: string = '?';
  readonly ICON_BOMB: string = 'X';
  readonly ICON_BUSTED: string = 'B';
  readonly ICON_OPEN: string = '-';
  readonly ICON_FLAG: string = 'F';
  readonly VALID_ACTIONS: Array<string> = ['open', 'flag', 'finish'];
  readonly HINTS: Array<string> = [this.ICON_OPEN, '1', '2', '3', '4', '5', '6', '7', '8'];

  constructor(x: number, y: number, bombs: number) {
    this.gridX = x;
    this.gridY = y;
    if(bombs > Math.floor((x*y)/2)) 
      throw new Error('Bombs can not cover more than half of the playing area');
    this.bombs = bombs;
    this.flags = bombs;
    this.grid = this.createGame();
    this.userGrid = this.initializeGrid(this.ICON_EMPTY);
  }

  getRandomInt(max: number) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  initializeGrid(fillValue: string = '') {
    return Object.seal(new Array(this.gridY).fill(fillValue).map(() => Object.seal(new Array(this.gridX).fill(fillValue))));
  }

  createGame() {
    // Initialize the game grid
    const gameGrid = this.initializeGrid();

    const getNumber = (x: number, y: number): number => {
      const minX = x ? x - 1 : x;
      const maxX = x === this.gridX - 1 ? x : x + 1;
      const minY = y ? y - 1 : y;
      const maxY = y === this.gridY - 1 ? y : y + 1;

      let numberCounter = 0;

      for(let i = minY; i <= maxY; i++) {
        for(let k = minX; k <= maxX; k++) {
          if(i === y && k === x) continue;
          if(gameGrid[i][k] === this.ICON_BOMB) numberCounter += 1;
        }
      }

      return numberCounter;
    }
    
    // Place the bombs
    let placedBombCount = 0;
    while(placedBombCount < this.bombs) {
      const randomX = this.getRandomInt(this.gridX);
      const randomY = this.getRandomInt(this.gridY);
      if(!gameGrid[randomY][randomX]) {
        // Place a bomb
        gameGrid[randomY][randomX] = this.ICON_BOMB;
        placedBombCount += 1;
      }
    }

    // Create numbers
    gameGrid.forEach((row, rowIndex) => {
      row.forEach((col, colIndex) => {
        if(col !== this.ICON_BOMB)
          gameGrid[rowIndex][colIndex] = getNumber(colIndex, rowIndex);
      })
    })

    return gameGrid;
  }

  generateUserRow(index: number) {
    return this.userGrid[index].map((x) => `${x || this.ICON_EMPTY} `).join('');
  }

  generateSolutionRow(index: number) {
    return this.grid[index].map((x) => `${x || this.ICON_EMPTY} `).join('');
  }

  display(solution: boolean = false) {
    const displayGrid = [];
    let row = `You have ${this.flags} flags remaining`;
    displayGrid.push(row);
    row = '0 ' + Array(this.gridX).fill('').map((_, i) => `${i+1} `).join('');
    displayGrid.push(row);

    Array(this.gridY).fill('').map((_, i) => {
      row = `${i+1} `
      row += solution ? this.generateSolutionRow(i) : this.generateUserRow(i);

      displayGrid.push(row);
    })

    displayGrid.forEach((gridRow) => console.log(gridRow));
  }

  start() {
    const readline = require("readline");
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const validateInput = (input: string): ActionInput => {
      const [action, x, y]: Array<string> = input.split(' ');

      if(action === 'finish')
        return {
          xIndex: 0,
          yIndex: 0,
          action: 'finish'
        }

      if(!x || !y || !action)
        throw new Error('3 input values are expected');

      const xIndex = parseInt(x) - 1;
      const yIndex = parseInt(y) - 1;

      if(xIndex >= this.gridX)
        throw new Error('X input is out of bounds');

      if(yIndex >= this.gridY)
        throw new Error('Y input is out of bounds');

      if(!this.VALID_ACTIONS.includes(action))
        throw new Error('Invalid action provided. Only "open" and "flag" are allowed.');

      return {
        xIndex,
        yIndex,
        action,
      }
    }

    const openAction = (xIndex: number, yIndex: number) => {
      const autoOpen = (startX: number, startY: number) => {
        if( 
          this.userGrid[startY][startX] === this.ICON_FLAG || 
          this.userGrid[startY][startX] === this.ICON_OPEN
        ) {
          return;
        }

        if(this.HINTS.includes(this.grid[startY][startX].toString())) {
          this.userGrid[startY][startX] = this.grid[startY][startX];
          return;
        } else {
          this.userGrid[startY][startX] = this.ICON_OPEN;
        }
        
        // Go left
        if(startX > 0) {
          autoOpen(startX - 1, startY);
        }  
        // Go right
        if(startX < this.gridX - 1) {
          autoOpen(startX + 1, startY);
        }
        // Go up
        if(startY > 0) {
          autoOpen(startX, startY - 1);
        }
        // Go down
        if(startY < this.gridY - 1 ) {
          autoOpen(startX, startY + 1);
        }
      }

      // Check if field already open
      if(this.HINTS.includes(this.grid[yIndex][xIndex]))
        return console.log('This tile has already been played');

      if(this.grid[yIndex][xIndex] === this.ICON_FLAG) {
        this.flags += 1;
      }

      // Check if location contains a bomb
      if(this.grid[yIndex][xIndex] === this.ICON_BOMB) {
        this.userGrid[yIndex][xIndex] = this.ICON_BUSTED;
        this.display();
        console.log('You have hit a bomb! The game will now end.');
        return rl.close();
      }

      autoOpen(xIndex, yIndex);
    }

    const flagAction = (xIndex: number, yIndex: number) => {
      // Check if field already open
      if(this.HINTS.includes(this.grid[yIndex][xIndex]))
        return console.log('This tile has already been played');
      
      if(this.userGrid[yIndex][xIndex] === this.ICON_FLAG) {
        this.flags += 1;
        this.userGrid[yIndex][xIndex] = this.ICON_EMPTY;
      } else {
        this.flags -= 1;
        this.userGrid[yIndex][xIndex] = this.ICON_FLAG;
      }
    }

    const checkWinCondition = () => {
      let finished = true;

      if(this.flags > 0)
        return false;

      this.grid.forEach((rows, rowIndex) => {
        rows.forEach((col, colIndex) => {
          if(col === this.ICON_BOMB) {
            if(this.userGrid[rowIndex][colIndex] !== this.ICON_FLAG)
              finished = false;
          }            
        });
      });

      return finished;
    }

    const handleAction = (input: string) => {
      let actionInput: ActionInput;

      try {
        actionInput = validateInput(input);
      } catch (err) {
        return console.log(err.message);
      }

      const { xIndex, yIndex, action } = actionInput;

      switch(action) {
        case 'open':
          openAction(xIndex, yIndex);
          break;
        case 'flag':
          flagAction(xIndex, yIndex);
          break;
        case 'finish':
          if(checkWinCondition()) {
            console.log('All bombs were identified. You win!');
            rl.close();
          } else {
            console.log('Not done yet! Keep trying.');
          }
          break;
        default:
          return console.log('Invalid action provided.');
      }
    }

    const playGame = () => {
      this.display();
      rl.question('Next action (action y-axis x-axis): ', (action: string) => {
        if(action === 'quit' || action === 'QUIT') {
          rl.close();
        } else {
          handleAction(action);
          playGame();
        }
      })
    }

    rl.question("To start a game, type 'START'", (prompt: string) => {
      if(prompt === 'START' || prompt === 'start') {
        this.display(true);
        playGame();
      } else {
        rl.close();
      }
    })

    rl.question("What is your name ? ", function(name: string) {
        rl.question("Where do you live ? ", function(country: string) {
            console.log(`${name}, is a citizen of ${country}`);
            rl.close();
        });
    });

    rl.on("close", function() {
        console.log("\nBYE BYE !!!");
        process.exit(0);
    });
  }
}

const game = new Minesweeper(16, 16, 5);

game.start();