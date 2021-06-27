import React, { Dispatch, FormEvent, useMemo, useState } from 'react';
import { GoogleLogin, GoogleLoginResponse, GoogleLoginResponseOffline } from 'react-google-login';
import { LocationClient, Place, SearchPlaceIndexForTextCommand, SearchPlaceIndexForTextCommandOutput } from "@aws-sdk/client-location";
import { getDefaultRoleAssumerWithWebIdentity } from "@aws-sdk/client-sts";
import { fromWebToken } from "@aws-sdk/credential-provider-web-identity";

function getEnvVarOrDie(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Cannot find ${key}`);
  }
  return value;
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

function useLocationClient(loginResponse: GoogleLoginResponse) {
  const locationClient = useMemo(() => new LocationClient({
    region: 'us-east-2',
    credentials: fromWebToken({
      roleArn: getEnvVarOrDie('REACT_APP_ROLE_ARN'),
      webIdentityToken: loginResponse.tokenObj.id_token,
      roleAssumerWithWebIdentity: getDefaultRoleAssumerWithWebIdentity(),
    })
  }), [loginResponse]);
  return locationClient;
}

function PlaceList({places}: {places: Place[]}) {
  return (
    <div>
      <ul>
        {places.map((place, index) => <li key={index}>
          <div>{place.Label}</div>
          <div>{place.AddressNumber} {place.Street}</div>
          <div>{place.Municipality} {place.Region} {place.SubRegion} {place.PostalCode}</div>
          <div>{place.Geometry?.Point?.join(', ')}</div>
        </li>)}
      </ul>
    </div>
  )
}

interface AddressEntryProps {
  loginResponse: GoogleLoginResponse;
  onSearchResponse: Dispatch<Place[]>;
}

function AddressEntry({loginResponse, onSearchResponse}: AddressEntryProps) {
  const locationClient = useLocationClient(loginResponse);

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
      const places = response?.Results
        ?.map(r => r.Place)
        ?.filter(notEmpty) ?? [];
      onSearchResponse(places);
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
  const [places, setPlaces] = useState<Place[]>([]);

  function onLoginSuccess(response: GoogleLoginResponse | GoogleLoginResponseOffline) {
    console.log(response);
    setLoginResponse(response as GoogleLoginResponse);
  }

  function onLoginFailed(error: any) {
    console.error(error);
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
      {loginResponse && <AddressEntry loginResponse={loginResponse} onSearchResponse={setPlaces}/>}
      <PlaceList places={places} />
    </div>
  );
}
