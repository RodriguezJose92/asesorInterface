import { CallConectionStore } from "../stores/CallConectionStore";

const ConectOpenAI = async () => {

    const user = CallConectionStore.getState().user;
    const ephemeralKey = CallConectionStore.getState().ephemeralKey

    const model = "gpt-4o-realtime-preview";
    const baseUrl = "https://api.openai.com/v1/realtime";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: user!.localDescription?.sdp,
        headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp"
        },
    });

    if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error("Error from OpenAI:", errorText);
        throw new Error(`Failed to get SDP response: ${sdpResponse.status} ${errorText}`);
    }

    // Set remote description (answer)
    const answer = {
        type: "answer" as RTCSdpType,
        sdp: await sdpResponse.text(),
    };
    if (user) await user.setRemoteDescription(answer);
}

export default ConectOpenAI