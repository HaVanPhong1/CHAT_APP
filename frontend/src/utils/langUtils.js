export function isForeignText(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;

  // Foreign scripts (Japanese, Chinese, Korean, Cyrillic, Arabic, Thai, etc.)
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\u0400-\u04FF\uac00-\ud7af\u0600-\u06FF\u0e00-\u0e7f]/.test(trimmed)) {
    return true;
  }

  // Vietnamese accented characters
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/.test(trimmed)) {
    return false;
  }

  // Common foreign / English words
  const foreignPattern = /\b(hello|hi|hey|good|morning|evening|night|how|are|you|what|where|when|why|is|am|the|this|that|these|those|thanks|thank|please|sorry|welcome|tomorrow|today|yesterday|nice|fine|great|awesome|cool|meeting|project|work|review|reviewed|mockup|mockups|test|message|call|video|ready|done|sure|happy|friend|help|can|could|will|would|have|has|had|about|with|from|they|them|their|your|yours|ours|people|just|like|see|look|think|also|back|after|use|new|want|because|any|give|day|most)\b/i;
  return foreignPattern.test(trimmed);
}

export function isForeignMessage(message) {
  if (!message || message.fileType || !message.text) return false;
  if (message.lang && message.lang !== 'vi') return true;
  return isForeignText(message.text);
}
