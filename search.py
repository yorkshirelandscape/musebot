#!/usr/bin/env python3
"""
Script to query release dates from Discogs for artist/song title combos.

This script has three modes of operation:
  1) It may be given a single artist/title directly on the command line,
  2) it may be given CSV data listing multiple queries, or
  3) it may be used in interactive mode. (NOT IMPLEMENTED)

This script requires a valid Discogs personal token in the DISCOGS_TOKEN
environment variable.
"""


import argparse
import csv
import difflib
import itertools
import json
import os
import sys
import urllib.parse
import urllib.request


BASE_URL = "https://api.discogs.com"
SEARCH_URL = f"{BASE_URL}/database/search"
RELEASE_URL = f"{BASE_URL}/releases"
AGENT = "SearchScript/0.1"


class ReleaseNotFoundError(Exception):
    def __init__(self, artist, track, *args):
        self.artist = artist
        self.track = track
        message = f'No result found for artist "{artist}" and track "{track}"'
        super().__init__(message, *args)


def get_headers(token):
    return {
        "User-agent": AGENT,
        "Authorization": f"Discogs token={token}",
    }


def validate_result(result, filter_promo=True):
    if not result.get("year"):
        return False
    if filter_promo and any("Promo" in format.get("descriptions", []) for format in result.get("formats", [])):
        return False
    # TODO Filter out test pressings (TP), maybe jukebox releases too?
    return True


def get_release_id(artist, track, filter_promo=True):
    params = {
        "artist": artist,
        "track": track,
        "type": "release",
        "per_page": 100,
        "page": 1,
        "sort": "year",
        # "sort": "released",
        "sort_order": "asc",
    }
    url = f"{SEARCH_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, method="GET", headers=get_headers(TOKEN))
    data = json.loads(urllib.request.urlopen(req).read())
    for result in data["results"]:
        if validate_result(result, filter_promo):
            return result["id"]
    raise ReleaseNotFoundError(artist, track, data)


def get_release_info(release_id):
    url = f"{RELEASE_URL}/{release_id}"
    req = urllib.request.Request(url, method="GET", headers=get_headers(TOKEN))
    data = json.loads(urllib.request.urlopen(req).read())
    return data


def is_match(actual, search, threshold=0.6):
    return difflib.SequenceMatcher(a=actual.lower(), b=search.lower()).ratio() >= threshold


def print_info(release_info, search=None):
    print(f"URI: {release_info['uri']}")
    print(f"Title: {release_info['title']} ({release_info['resource_url']})")
    print(f"Released: {release_info.get('released')}")
    print(f"Year: {release_info['year']}")
    if len(release_info["formats"]) == 1:
        format = release_info["formats"][0]
        print(f"Format(s): {format['name']} ({', '.join(format['descriptions'])})")
    else:
        print("Format(s):")
        for format in release_info["formats"]:
            print(f"  {format['name']} ({', '.join(format['descriptions'])})")
    print(f"Genre(s): {', '.join(release_info['genres'])}")
    print(f"Style(s): {', '.join(release_info.get('styles', []))}")
    if len(release_info["artists"]) == 1:
        artist = release_info["artists"][0]
        print(f"Artist(s): {artist['name']} ({artist['resource_url']})")
    else:
        print("Artist(s):")
        for artist in release_info["artists"]:
            print(f"  {artist['name']} ({artist['resource_url']})")
    print(f"Master: {release_info.get('master_url')}")
    print("Track(s):")
    for track in release_info["tracklist"]:
        match = ">" if search is not None and is_match(track["title"], search) else " "
        print(f"{match} {track['position']} {track['title']} [{track['duration']}]")
    if "notes" in release_info:
        print("")
        print("Notes:")
        print(release_info["notes"])


def find_release(artist, track, filter_promo=True):
    release_id = get_release_id(artist, track, filter_promo)
    release_info = get_release_info(release_id)
    return release_info


def get_argument_parser():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "-i",
        "--interactive",
        action="store_true",
        default=False,
        help=(
            "Use program in interactive mode. This will automatically begin "
            "processing any input data given via arguments, if any, but will "
            "drop the user into an interactive prompt to verify data and "
            "continue processing new queries if desired. (NOT IMPLEMENTED)"
        ),
    )
    parser.add_argument(
        "-q",
        "--quiet",
        action="store_true",
        default=False,
        help=(
            "Suppress most output. For each query, outputs just the release "
            "year."
        ),
    )
    parser.add_argument(
        "--allow-promo",
        action="store_true",
        default=False,
        help=(
            "If set, does not filter promo releases from results."
        ),
    )
    parser.add_argument(
        "--csv",
        help=(
            "Filepath to CSV data of multiple queries to run. By default, the "
            "data is assumed to have a header row and for the first column to "
            "contain artist names and the second column to contain song titles. "
            "The --csv-no-header and --csv-columns options can adjust this "
            "behavior. The special value '-' indicates that CSV data should be "
            "read from STDIN instead. If the artist name is specified, the data "
            "is assumed to contain the song titles in the first column."
        ),
    )
    parser.add_argument(
        "--csv-header",
        default=None,
        action="store_true",
        help=(
            "Specifies that the input CSV data DOES contain a header row. Using "
            "this without specifying a --csv parameter is an error."
        ),
    )
    parser.add_argument(
        "--csv-no-header",
        dest="csv_header",
        action="store_false",
        help=(
            "Specifies that the input CSV data does NOT contain a header row. "
            "Using this without specifying a --csv parameter is an error."
        ),
    )
    parser.add_argument(
        "--csv-columns",
        nargs="+",
        default=None,
        help=(
            "Specifies which columns to read from the CSV data for artist and "
            "song title information. If the artist name is set, this must "
            "provide a single column index or label to use for song titles. If "
            "no artist is set, this must provide two column indices or labels, "
            "the first for the artist name and the second for the song title. "
            "If the arguments provided are integers, they will be used as "
            "indices, otherwise they will be matched exactly against the column "
            "headings in the first row of data. Using this option without the "
            "--csv option is an error. Specifying column indices or string "
            "headings that do not exist in the CSV data, or specifying string "
            "headings and --csv-no-header, is an error."
        ),
    )
    parser.add_argument(
        "--user-agent",
        default=AGENT,
        help="String to send in the User-Agent header.",
    )
    parser.add_argument(
        "artist",
        nargs="?",
        help=(
            "Sets the artist name for all queries for the given session. In "
            "interactive mode, this may be modified after processing all "
            "queries specified via the command line arguments. If used in "
            "combination with the --csv flags, will set the artist name for "
            "each CSV data row and only read the CSV data to determine song "
            "names."
        ),
    )
    parser.add_argument(
        "title",
        nargs="*",
        help=(
            "Specifies one or more song titles to query. If used in combination "
            "with the --csv flags, these titles will be processed first and the "
            "CSV data second."
        ),
    )
    return parser


def get_token(envvar="DISCOGS_TOKEN"):
    return os.environ.get(envvar)


def start_cli(artist_name):
    pass


def process_songs(songs, filter_promo=True, is_interactive=False, is_quiet=False):
    for artist, track in songs:
        if not is_quiet:
            print(f'Searching for artist "{artist}" and song "{track}"')
        try:
            release_info = find_release(artist, track, filter_promo)
        except ReleaseNotFoundError:
            if is_quiet:
                print()
                continue
            else:
                raise
        if release_info:
            if is_quiet:
                print(release_info["year"])
            else:
                print_info(release_info, search=track)


def zip_fill(fill, lst):
    return list(itertools.zip_longest([], lst, fillvalue=fill))


def get_csv_data(*, path, header, columns):
    # Determine whether columns are indices or column names
    try:
        columns = list(map(int, columns))
        column_labels = False
    except (TypeError, ValueError):
        if not header:
            raise ValueError(f"No header row specified to use with column labels: {columns}")
        column_labels = True
    with open(path, newline='') as f:
        reader = csv.reader(f)
        if header:
            header_row = next(reader)
        if column_labels:
            try:
                columns = [header_row.index(v) for v in columns]
            except ValueError:
                raise ValueError(f"Unable to find column label(s): {columns}")
            # columns should only be indices now
        return [tuple(row[i] for i in columns) for row in reader]


def main(artist_name, song_titles, csv_info, filter_promo=True, is_interactive=False, is_quiet=False):
    if artist_name:
        if not is_quiet:
            print(f'Limiting search to artist "{artist_name}"')
        songs = zip_fill(artist_name, song_titles)
    else:
        songs = []
    if csv_info:
        if artist_name:
            songs += zip_fill(artist_name, get_csv_data(**csv_info))
        else:
            songs = get_csv_data(**csv_info)
    process_songs(songs, filter_promo, is_interactive, is_quiet)
    if is_interactive:
        start_cli(artist_name)


if __name__ == "__main__":
    parser = get_argument_parser()
    TOKEN = get_token()
    if not TOKEN:
        parser.error("Missing access token")

    args = parser.parse_args()

    # Mostly this will just be setting it back to the value it already was
    AGENT = args.user_agent

    is_interactive = args.interactive
    is_quiet = args.quiet
    filter_promo = not args.allow_promo

    artist_name = args.artist if args.artist else None
    song_titles = args.title

    csv_info = {}
    if args.csv:
        csv_info["path"] = args.csv
        if args.csv_header is None:
            args.csv_header = True
        csv_info["header"] = args.csv_header
        if args.csv_columns is None:
            columns = [0] if artist_name else [0, 1]
        else:
            if artist_name and len(args.csv_columns) != 1:
                parser.error("When specifying an artist name, may only specify a single column")
            elif artist_name is None and len(args.csv_columns) != 2:
                parser.error("Must specify both an artist name and song title column")
            columns = args.csv_columns
        csv_info["columns"] = columns
    elif args.csv_header is not None or args.csv_columns:
        parser.error("Must specify --csv argument")

    main(artist_name, song_titles, csv_info, filter_promo, is_interactive, is_quiet)
