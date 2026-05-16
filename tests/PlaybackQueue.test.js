import { describe, it, expect, beforeEach } from 'vitest';
import { PlaybackQueue } from '../src/core/PlaybackQueue';

describe('PlaybackQueue (Fila de Reprodução)', () => {
    let queue;

    beforeEach(() => {
        queue = new PlaybackQueue();
    });

    // Teste 1: Caso vazio (Verifica o comportamento em fila vazia)
    it('should throw an error when trying to dequeue an empty queue', () => {
        expect(queue.isEmpty()).toBe(true);
        expect(() => queue.dequeue()).toThrowError("ERROR: The playback queue is empty.");
    });

    // Teste 2: Caso base (Insere um item e remove verificando integridade)
    it('should correctly enqueue and dequeue a single track', () => {
        const track = { name: "Test Song", artist: "Test Artist" };

        queue.enqueue(track);
        expect(queue.isEmpty()).toBe(false);
        expect(queue.peek()).toEqual(track);

        const dequeuedTrack = queue.dequeue();
        expect(dequeuedTrack).toEqual(track);
        expect(queue.isEmpty()).toBe(true);
    });

    // Teste 3: Múltiplos elementos (Garante o comportamento O(1) rotativo sem perder ordem FIFO)
    it('should handle multiple tracks maintaining FIFO order', () => {
        queue.enqueue({ name: "Song 1" });
        queue.enqueue({ name: "Song 2" });
        queue.enqueue({ name: "Song 3" });

        expect(queue.getQueueState().length).toBe(3);

        expect(queue.dequeue().name).toBe("Song 1");
        expect(queue.dequeue().name).toBe("Song 2");

        // Verifica o estado interno (Frente da fila deve estar em "Song 3")
        expect(queue.getQueueState().length).toBe(1);
        expect(queue.peek().name).toBe("Song 3");
    });
});