import { useEffect, useState } from 'react';

const storageKey = 'pochita-chat-thread';

async function chatRequest(method, path, ...args) {
  try {
    if (window.pet?.[method]) return await window.pet[method](...args);

    const payload = method === 'chatHistory' ? undefined
      : method === 'sendChatMessage' ? { message: args[1] } : {};
    const response = await fetch(path, payload === undefined ? {
      signal: AbortSignal.timeout(65000),
    } : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(65000),
    });
    return response.ok ? { data: await response.json() } : { status: response.status };
  } catch {
    return { status: 503 };
  }
}

const threadPath = '/api/chat/threads';
const messagePath = (id) => threadPath + '/' + id + '/messages';
const getHistory = (id) => chatRequest('chatHistory', messagePath(id), id);
const sendMessage = (id, message) => chatRequest('sendChatMessage', messagePath(id), id, message);
const createThread = () => chatRequest('createChatThread', threadPath);

function getSavedThread() {
  const id = Number(localStorage.getItem(storageKey));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function chatError(status) {
  if (status === 402) return 'Ollama Cloud needs usage credits before Pochita can reply.';
  if (status === 502) return 'Pochita couldn’t get a reply from Ollama. Try again.';
  if (status === 409) return 'The conversation changed. Try sending your message again.';
  if (status === 400) return 'Write a message between 1 and 500 characters.';
  return 'Couldn’t reach the chat API. Check that Spring Boot is running.';
}

export function usePochitaChat() {
  const [initialThread] = useState(getSavedThread);
  const [threadId, setThreadId] = useState(initialThread);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(Boolean(initialThread));
  const [historyLoaded, setHistoryLoaded] = useState(!initialThread);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialThread) return;
    let active = true;
    getHistory(initialThread).then(({ data, status }) => {
      if (!active) return;
      if (data) {
        setMessages(data);
        setHistoryLoaded(true);
      }
      if (status === 404) {
        localStorage.removeItem(storageKey);
        setThreadId(null);
        setHistoryLoaded(true);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [initialThread]);

  async function send(text) {
    if (loading || pending) return false;
    setPending(true);
    setError('');

    try {
      let result = threadId ? await sendMessage(threadId, text) : null;
      const replaceThread = !result || result.status === 404;
      if (replaceThread) {
        if (threadId) {
          localStorage.removeItem(storageKey);
          setThreadId(null);
          setMessages([]);
        }
        const created = await createThread();
        if (!created.data) {
          setError(chatError(created.status));
          return false;
        }
        const id = created.data.id;
        localStorage.setItem(storageKey, String(id));
        setThreadId(id);
        setHistoryLoaded(true);
        result = await sendMessage(id, text);
      }

      if (!result.data) {
        setError(chatError(result.status));
        return false;
      }

      const { user, assistant } = result.data;
      if (!replaceThread && !historyLoaded) {
        const { data } = await getHistory(threadId);
        if (data) {
          setMessages(data);
          setHistoryLoaded(true);
          return true;
        }
      }
      setMessages((previous) => [...previous, user, assistant]);
      return true;
    } finally {
      setPending(false);
    }
  }

  return { messages, loading, pending, error, send };
}
