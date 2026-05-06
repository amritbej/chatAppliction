
import { useRef, useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const useWebRTC = () => {
  const { socket } = useSocket();
  const [callState, setCallState] = useState("idle"); 
  const [callType, setCallType] = useState(null); 
  const [caller, setCaller] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const pendingOfferRef = useRef(null);
  const pendingCallTarget = useRef(null);
  const activeRoomCallRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const attachLocalStream = (stream) => {
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  };

  const getLocalStream = async (type) => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: type === "video",
      audio: true,
    });
    attachLocalStream(stream);
    return stream;
  };

  const upsertRemoteStream = (userId, username, stream) => {
    setRemoteStreams((current) => {
      const next = current.filter((item) => item.userId !== userId);
      return [...next, { userId, username, stream }];
    });

    if (remoteVideoRef.current && remoteStreams.length === 0) {
      remoteVideoRef.current.srcObject = stream;
    }
  };

  const removeRemoteStream = (userId) => {
    setRemoteStreams((current) => current.filter((item) => item.userId !== userId));
  };

  const createPeerConnection = (peerId, peerUsername) => {
    const existing = peerConnectionsRef.current.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;

      if (activeRoomCallRef.current?.roomId) {
        socket.emit("call:room:ice", {
          roomId: activeRoomCallRef.current.roomId,
          to: peerId,
          candidate: event.candidate,
        });
        return;
      }

      socket.emit("call:ice", {
        to: caller?.userId || pendingCallTarget.current,
        candidate: event.candidate,
      });
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        upsertRemoteStream(peerId, peerUsername, stream);
      }
    };

    localStreamRef.current
      ?.getTracks()
      .forEach((track) => pc.addTrack(track, localStreamRef.current));

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  };

  const closePeerConnection = (peerId) => {
    peerConnectionsRef.current.get(peerId)?.close();
    peerConnectionsRef.current.delete(peerId);
    removeRemoteStream(peerId);
  };

  const callPeerInRoom = async (peer) => {
    const pc = createPeerConnection(peer.userId, peer.username);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("call:room:offer", {
      roomId: activeRoomCallRef.current.roomId,
      to: peer.userId,
      offer,
      callType: activeRoomCallRef.current.callType,
    });
  };

  const startCall = async (target, type = "video") => {
    try {
      setCallType(type);
      setRemoteStreams([]);
      await getLocalStream(type);

      if (typeof target === "object" && target?.roomId) {
        activeRoomCallRef.current = {
          roomId: target.roomId,
          roomName: target.roomName,
          callType: type,
        };
        setCaller({ username: target.roomName || "Group call" });
        setCallState("connected");
        socket.emit("call:room:start", { roomId: target.roomId, callType: type });
        return;
      }

      setCallState("calling");
      pendingCallTarget.current = target;

      const pc = createPeerConnection(target, "Remote user");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call:offer", { to: target, offer, callType: type });
    } catch (err) {
      console.error("Error starting call:", err);
      endCall();
    }
  };

  const acceptCall = async () => {
    try {
      const pending = pendingOfferRef.current;
      if (!pending) return;

      setCallState("connected");
      await getLocalStream(pending.type);

      if (pending.roomId) {
        activeRoomCallRef.current = {
          roomId: pending.roomId,
          roomName: pending.roomName,
          callType: pending.type,
        };
        socket.emit("call:room:accept", { roomId: pending.roomId });
        return;
      }

      const pc = createPeerConnection(pending.from, pending.fromUsername);
      await pc.setRemoteDescription(new RTCSessionDescription(pending.offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call:answer", { to: pending.from, answer });
    } catch (err) {
      console.error("Error accepting call:", err);
      endCall();
    }
  };

  const rejectCall = () => {
    if (pendingOfferRef.current?.roomId) {
      socket.emit("call:room:reject", { roomId: pendingOfferRef.current.roomId });
    } else if (pendingOfferRef.current?.from) {
      socket.emit("call:reject", { to: pendingOfferRef.current.from });
    }

    setCallState("idle");
    setCaller(null);
    pendingOfferRef.current = null;
  };

  const endCall = () => {
    const roomId = activeRoomCallRef.current?.roomId;
    const target = caller?.userId || pendingCallTarget.current;

    if (roomId) {
      socket?.emit("call:room:leave", { roomId });
    } else if (target) {
      socket?.emit("call:end", { to: target });
    }

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    peerConnectionsRef.current.forEach((pc) => pc.close());

    localStreamRef.current = null;
    peerConnectionsRef.current = new Map();
    pendingCallTarget.current = null;
    pendingOfferRef.current = null;
    activeRoomCallRef.current = null;
    setRemoteStreams([]);

    setCallState("idle");
    setCallType(null);
    setCaller(null);
  };

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
  };

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [callState]);

  useEffect(() => {
    if (!socket) return;

    socket.on("call:incoming", ({ from, fromUsername, offer, callType, roomId, roomName }) => {
      pendingOfferRef.current = {
        from,
        fromUsername,
        offer,
        type: callType,
        roomId,
        roomName,
      };
      setCaller({
        userId: from,
        username: roomId ? `${fromUsername} in ${roomName || "group call"}` : fromUsername,
      });
      setCallType(callType);
      setCallState("ringing");
    });

    socket.on("call:answered", async ({ answer }) => {
      const pc = peerConnectionsRef.current.get(pendingCallTarget.current);
      await pc?.setRemoteDescription(new RTCSessionDescription(answer));
      setCallState("connected");
    });

    socket.on("call:ice", async ({ candidate }) => {
      try {
        const pc = peerConnectionsRef.current.get(
          caller?.userId || pendingCallTarget.current
        );
        await pc?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("ICE candidate error:", e);
      }
    });

    socket.on("call:room:existing-users", async ({ roomId, callType, users }) => {
      if (activeRoomCallRef.current?.roomId !== roomId) return;
      activeRoomCallRef.current.callType = callType;
      await Promise.all(users.map((user) => callPeerInRoom(user)));
    });

    socket.on("call:room:offer", async ({ roomId, from, fromUsername, offer, callType }) => {
      try {
        if (activeRoomCallRef.current?.roomId !== roomId) return;
        await getLocalStream(callType);
        const pc = createPeerConnection(from, fromUsername);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call:room:answer", { roomId, to: from, answer });
      } catch (e) {
        console.error("Room offer error:", e);
      }
    });

    socket.on("call:room:answer", async ({ from, answer }) => {
      try {
        const pc = peerConnectionsRef.current.get(from);
        await pc?.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (e) {
        console.error("Room answer error:", e);
      }
    });

    socket.on("call:room:ice", async ({ from, candidate }) => {
      try {
        const pc = peerConnectionsRef.current.get(from);
        await pc?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Room ICE candidate error:", e);
      }
    });

    socket.on("call:room:user-left", ({ userId }) => {
      closePeerConnection(userId);
    });

    socket.on("call:rejected", endCall);
    socket.on("call:ended", endCall);

    return () => {
      socket.off("call:incoming");
      socket.off("call:answered");
      socket.off("call:ice");
      socket.off("call:room:existing-users");
      socket.off("call:room:offer");
      socket.off("call:room:answer");
      socket.off("call:room:ice");
      socket.off("call:room:user-left");
      socket.off("call:rejected");
      socket.off("call:ended");
    };
  }, [socket, caller]);

  return {
    callState,
    callType,
    caller,
    localVideoRef,
    remoteVideoRef,
    remoteStreams,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
};
