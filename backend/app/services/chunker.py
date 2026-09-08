"""Deterministic text chunker with timestamp/offset detection for transcripts and documents."""

import re
from typing import List, Optional, Tuple
from app.models.vault import SourceChunk

# Regex patterns matching standard timestamps: [00:12], 01:23:45, [1:23:45], etc.
TIMESTAMP_PATTERN = re.compile(r"\[?(\b\d{1,2}:\d{2}(?::\d{2})?\b)\]?")


class DocumentChunker:
    """Chunks text deterministically and extracts timestamp offsets when present."""

    def __init__(self, default_chunk_size: int = 1500, default_overlap: int = 200):
        self.default_chunk_size = default_chunk_size
        self.default_overlap = default_overlap

    def extract_timestamps(self, text: str) -> Tuple[Optional[str], Optional[str]]:
        """Extract first and last timestamps from a piece of text if available."""
        matches = TIMESTAMP_PATTERN.findall(text)
        if not matches:
            return None, None
        return matches[0], matches[-1]

    def chunk_text(
        self,
        source_id: str,
        text: str,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ) -> List[SourceChunk]:
        """Split text into overlapping chunks with word boundary preservation."""
        size = chunk_size or self.default_chunk_size
        overlap = chunk_overlap or self.default_overlap

        if overlap >= size:
            overlap = max(0, size // 5)

        text = text.strip()
        if not text:
            return []

        chunks: List[SourceChunk] = []
        start = 0
        total_len = len(text)
        chunk_index = 0

        # If text is smaller than chunk size, return single chunk
        if total_len <= size:
            ts_start, ts_end = self.extract_timestamps(text)
            chunks.append(
                SourceChunk(
                    chunk_id=f"{source_id}_chunk_{chunk_index}",
                    chunk_index=chunk_index,
                    text=text,
                    timestamp_start=ts_start,
                    timestamp_end=ts_end,
                    char_count=total_len,
                    word_count=len(text.split()),
                )
            )
            return chunks

        step = size - overlap
        while start < total_len:
            end = min(start + size, total_len)

            # Avoid splitting words if in middle of text
            if end < total_len:
                # Look for paragraph break first, then newline, then space
                para_break = text.rfind("\n\n", start, end)
                if para_break != -1 and para_break > start + (size // 2):
                    end = para_break + 2
                else:
                    newline_break = text.rfind("\n", start, end)
                    if newline_break != -1 and newline_break > start + (size // 2):
                        end = newline_break + 1
                    else:
                        space_break = text.rfind(" ", start, end)
                        if space_break != -1 and space_break > start + (size // 2):
                            end = space_break + 1

            chunk_text_slice = text[start:end].strip()
            if chunk_text_slice:
                ts_start, ts_end = self.extract_timestamps(chunk_text_slice)
                chunks.append(
                    SourceChunk(
                        chunk_id=f"{source_id}_chunk_{chunk_index}",
                        chunk_index=chunk_index,
                        text=chunk_text_slice,
                        timestamp_start=ts_start,
                        timestamp_end=ts_end,
                        char_count=len(chunk_text_slice),
                        word_count=len(chunk_text_slice.split()),
                    )
                )
                chunk_index += 1

            if end >= total_len:
                break
            start = end - overlap if (end - overlap) > start else end

        return chunks
