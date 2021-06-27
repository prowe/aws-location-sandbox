import React, { Dispatch, FormEvent, useMemo, useState } from 'react';
import { GoogleLogin, GoogleLoginResponse, GoogleLoginResponseOffline } from 'react-google-login';
import { LocationClient, SearchPlaceIndexForTextCommand, SearchPlaceIndexForTextCommandOutput } from "@aws-sdk/client-location";
import { getDefaultRoleAssumerWithWebIdentity } from "@aws-sdk/client-sts";
import { fromWebToken } from "@aws-sdk/credential-provider-web-identity";

function getEnvVarOrDie(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Cannot find ${key}`);
  }
  return value;
}

function onLoginFailed(error: any) {
  console.error(error);
}

function ResponsePanel({response}: {response: SearchPlaceIndexForTextCommandOutput}) {
  return (
    <div>
      <ul>
        {response.Results?.map(({Place}, index) => <li key={index}>
          <div>{Place?.AddressNumber} {Place?.Street}</div>
          <div>{Place?.Municipality} {Place?.Region} {Place?.SubRegion} {Place?.PostalCode}</div>
          <div>{Place?.Geometry?.Point?.join(', ')}</div>
        </li>)}
      </ul>
    </div>
  )
}

interface AddressEntryProps {
  loginResponse: GoogleLoginResponse;
  onSearchResponse: Dispatch<SearchPlaceIndexForTextCommandOutput>;
}

function AddressEntry({loginResponse, onSearchResponse}: AddressEntryProps) {
  const locationClient = useMemo(() => new LocationClient({
    region: 'us-east-2',
    credentials: fromWebToken({
      roleArn: getEnvVarOrDie('REACT_APP_ROLE_ARN'),
      webIdentityToken: loginResponse.tokenObj.id_token,
      roleAssumerWithWebIdentity: getDefaultRoleAssumerWithWebIdentity(),
    })
  }), [loginResponse]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = (event.currentTarget.elements.namedItem('address') as HTMLInputElement).value;
    console.log('submitting', address);
    try {
      const response = await locationClient.send(new SearchPlaceIndexForTextCommand({
        IndexName: getEnvVarOrDie('REACT_APP_PLACE_INDEX_NAME'),
        Text: address
      }));
      console.log("got response", response);
      onSearchResponse(response);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <label>
        Address:
        <input name='address' required />
      </label>
      <button type='submit'>Submit</button>
    </form>
  )
}

export default function App() {
  const [loginResponse, setLoginResponse] = useState<GoogleLoginResponse>();
  const [searchResponse, setSearchResponse] = useState<SearchPlaceIndexForTextCommandOutput>();

  function onLoginSuccess(response: GoogleLoginResponse | GoogleLoginResponseOffline) {
    console.log(response);
    setLoginResponse(response as GoogleLoginResponse);
  }
  
  return (
    <div>
      <GoogleLogin
        clientId={getEnvVarOrDie('REACT_APP_CLIENT_ID')}
        buttonText="Login"
        onSuccess={onLoginSuccess}
        onFailure={onLoginFailed}
        cookiePolicy={'single_host_origin'}
      />
      {loginResponse && <AddressEntry loginResponse={loginResponse} onSearchResponse={setSearchResponse}/>}
      {searchResponse && <ResponsePanel response={searchResponse} />}
    </div>
  );
}
