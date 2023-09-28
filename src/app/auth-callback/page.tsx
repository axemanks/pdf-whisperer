// auth-callback - to sync the logged in user session to auth db

import { useRouter, useSearchParams } from "next/navigation";

const Page = () => {
    const router = useRouter();
    const searchedParams = useSearchParams();
    const origin = searchedParams.get('origin'); // ex. auth-callback?origin=dashboard'

    
};
export default Page;