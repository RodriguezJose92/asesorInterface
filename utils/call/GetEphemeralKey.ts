import { CallConectionStore } from "../stores/CallConectionStore";

const GetEphemeralKey = async () => {

    const currentRequest = new URLSearchParams(location.search);
    const sku = currentRequest.get('sku')
    const idCompany = currentRequest.get('idCompany')

    try {
        if (!idCompany || !sku) throw new Error('fail Get Ephemeral Key')
        const tokenResponse = await fetch(`https://mudi.voiceia.mudi.com.co/session?sku=${sku}&companyId=${idCompany}`);
        const data = await tokenResponse.json();

        if (data) {
            const updateKey = CallConectionStore.getState().setEphemeralKey
            updateKey(data.client_secret?.value)
        };

    } catch (error) {
        console.log(error)
    };

};

export default GetEphemeralKey