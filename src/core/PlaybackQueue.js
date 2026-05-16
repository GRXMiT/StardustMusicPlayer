// Estrutura de Fila (Queue) implementada usando um dicionário para garantir O(1) na inserção e remoção.
export class PlaybackQueue {
    constructor() {
        this.items = {}; // Objeto para armazenar os itens
        this.head = 0;   // Ponteiro da frente (início da fila)
        this.tail = 0;   // Ponteiro do fim (final da fila)
    }

    // Adiciona um item no final da fila.
    enqueue(track) {
        this.items[this.tail] = track;
        this.tail++;
    }

    // Remove e retorna o item do início da fila.
    dequeue() {
        if (this.isEmpty()) {
            throw new Error("ERROR: The playback queue is empty.");
        }
        const track = this.items[this.head];
        delete this.items[this.head];
        this.head++;
        return track;
    }

    // Limpa a fila inteira - O(1)
    clear() {
        this.items = {};
        this.head = 0;
        this.tail = 0;
    }

    // Retorna o item do início sem removê-lo.
    peek() {
        if (this.isEmpty()) return null;
        return this.items[this.head];
    }

    // Verifica se a fila está vazia.
    isEmpty() {
        return this.head === this.tail;
    }

    // Retorna o estado atual da fila como um array para exibição na UI.
    getQueueState() {
        const currentState = [];
        for (let i = this.head; i < this.tail; i++) {
            currentState.push(this.items[i]);
        }
        return currentState;
    }
}