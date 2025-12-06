export * from './autocomplete-location.query';
export * from './search-location.query';
export * from './get-location-by-id.query';

import { AutocompleteLocationHandler } from './autocomplete-location.query';
import { SearchLocationHandler } from './search-location.query';
import { GetLocationByIdHandler } from './get-location-by-id.query';

export const LocationQueryHandlers = [
  AutocompleteLocationHandler,
  SearchLocationHandler,
  GetLocationByIdHandler,
];
