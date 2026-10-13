import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useRecordedTranscription } from "./useRecordedTranscription";

/**
 * jsdom has neither MediaRecorder nor getUserMedia, so both are faked. The
 * fake recorder behaves like the real one where it matters: stopping the
 * stream's tracks ends the recording and fires onstop with what was
 * captured.
 */

interface FakeTrack {
  stopped: boolean;
  stop: () => void;
}

interface FakeRecorder {
  state: "inactive" | "recording";
  mimeType: string;
  stream: { getTracks: () => FakeTrack[] };
  ondataavailable: ((e: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  start: () => void;
  stop: () => void;
}

let tracks: FakeTrack[] = [];
let recorders: FakeRecorder[] = [];
let grantPermission: () => void = () => {};

function makeStream() {
  const track: FakeTrack = { stopped: false, stop: () => void (track.stopped = true) };
  tracks.push(track);
  return { getTracks: () => [track] };
}

beforeEach(() => {
  tracks = [];
  recorders = [];
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      // Held open, as if the permission prompt were still showing.
      getUserMedia: vi.fn(
        () => new Promise((resolve) => (grantPermission = () => resolve(makeStream()))),
      ),
    },
  });
  (window as unknown as { MediaRecorder: unknown }).MediaRecorder = function FakeMediaRecorder(
    stream: FakeRecorder["stream"],
  ) {
    const recorder: FakeRecorder = {
      state: "inactive",
      mimeType: "audio/webm",
      stream,
      ondataavailable: null,
      onstop: null,
      start() {
        recorder.state = "recording";
      },
      stop() {
        recorder.state = "inactive";
        recorder.ondataavailable?.({ data: new Blob([new Uint8Array(512)]) });
        recorder.onstop?.();
      },
    };
    recorders.push(recorder);
    return recorder;
  };
  global.fetch = vi.fn(async () => new Response(JSON.stringify({ text: "cement" }), { status: 200 })) as unknown as typeof fetch;
});

afterEach(() => {
  delete (window as unknown as { MediaRecorder?: unknown }).MediaRecorder;
});

describe("useRecordedTranscription: the microphone is never left on", () => {
  test("permission granted after unmount releases the stream immediately", async () => {
    const { result, unmount } = renderHook(() => useRecordedTranscription({ language: "en", onResult: vi.fn() }));

    act(() => result.current.start());
    unmount(); // e.g. navigated away with the permission prompt open
    await act(async () => grantPermission());

    expect(tracks).toHaveLength(1);
    expect(tracks[0].stopped).toBe(true);
    expect(recorders).toHaveLength(0);
  });

  test("a second click while permission is pending does not open a second stream", async () => {
    const { result } = renderHook(() => useRecordedTranscription({ language: "en", onResult: vi.fn() }));

    act(() => result.current.start());
    act(() => result.current.start());
    await act(async () => grantPermission());

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    expect(result.current.state.kind).toBe("recording");
  });

  test("start() while already recording is ignored", async () => {
    const { result } = renderHook(() => useRecordedTranscription({ language: "en", onResult: vi.fn() }));

    act(() => result.current.start());
    await act(async () => grantPermission());
    act(() => result.current.start());

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  });

  test("unmounting mid-recording stops the mic and does not upload the abandoned clip", async () => {
    const onResult = vi.fn();
    const { result, unmount } = renderHook(() => useRecordedTranscription({ language: "en", onResult }));

    act(() => result.current.start());
    await act(async () => grantPermission());
    // The real recorder ends when its tracks stop; the fake needs telling.
    const recorder = recorders[0];
    unmount();
    act(() => recorder.stop());

    expect(tracks[0].stopped).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });
});

describe("useRecordedTranscription: the normal path still works", () => {
  test("record, stop, upload, deliver the transcript", async () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useRecordedTranscription({ language: "hi", onResult }));

    act(() => result.current.start());
    await act(async () => grantPermission());
    act(() => result.current.stop());

    await waitFor(() => expect(onResult).toHaveBeenCalledWith("cement"));
    expect(result.current.state.kind).toBe("idle");
    expect(tracks[0].stopped).toBe(true);
    const form = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as FormData;
    expect(form.get("language")).toBe("hi");
  });

  test("can record again after a denied permission", async () => {
    const { result } = renderHook(() => useRecordedTranscription({ language: "en", onResult: vi.fn() }));
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new DOMException("denied", "NotAllowedError"),
    );

    await act(async () => result.current.start());
    expect(result.current.state).toMatchObject({ kind: "error", message: expect.stringMatching(/denied/i) });

    act(() => result.current.start());
    await act(async () => grantPermission());
    expect(result.current.state.kind).toBe("recording");
  });
});
