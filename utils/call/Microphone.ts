import { CallConectionStore } from "../stores/CallConectionStore";

class Microphone {

    private connectStream() {
        /** Add Mic to PeerConection */
        const user = CallConectionStore.getState().user;
        const mic = CallConectionStore.getState().micUser
        user && mic && (
            mic.getAudioTracks().forEach(track => {
                user.addTrack(track, mic);
                console.log("Added audio track to peer connection:", track);
            })
        );

    }

    async Start() {

        /** Verify Mic */
        try {

            let ms = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            if (!ms) {
                console.error("No MediaStream returned from getUserMedia");
                return
            }

            CallConectionStore.getState().setMicUser(ms);
            CallConectionStore.getState().setStatusMic(false);

            const tracks = CallConectionStore.getState().micUser?.getTracks()!;
            if (tracks.length === 0) {
                console.error("No tracks found in MediaStream");
            } else {
                tracks.forEach(track => {
                    console.log("Microphone track:", track);
                    console.log("Track enabled:", track.enabled, "Muted:", track.muted, "ReadyState:", track.readyState);
                });
            };

            /** Conected Stream */
            this.connectStream();

        } catch (err: any) {
            if (err.name === "NotAllowedError") {
                console.warn("❌ Permiso de micrófono denegado por el usuario.");
            } else {
                console.error("Otro error con el micrófono:", err);
            }
        };

    }

    handlerStatusdMic(status: boolean) {
        const mic = CallConectionStore.getState().micUser
        mic?.getAudioTracks().forEach(track => {
            track.enabled = status
            CallConectionStore.getState().setStatusMic(status);
        })
    }
}

const microphone = new Microphone()
export default microphone;