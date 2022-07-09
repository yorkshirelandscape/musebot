import math
import uuid

import utils

__all__ = ("Submission",)


class Submission:
    """
    Container class for an individual submission
    """

    def __init__(self, *, artist, song, submitter, seed, slot=None, q=None, is_bye=False, **kwargs):
        """
        Constructor for a `Submission` instance.

        Requires the following keyword-only arguments:
            - ``artist``
            - ``song``
            - ``submitter``
            - ``seed``
        Any additional keyword arguments will be ignored.

        :param artist: The string name of the artist who performed/composed the
            song
        :param song: The string title of the song
        :param submitter: The string handle of the user who submitted the song
        :param seed: The 1-indexed seed position within the submitter's list, 0
            indicates a song was submitted by other users as well
        """

        self.is_bye = is_bye
        self.artist = artist
        self.artist_cmp = utils.get_canonical_artist(artist)
        self.song = song
        self.submitter = submitter
        # Ideally we would go by submitter ID
        # but this should be good enough for now
        self.submitter_cmp = utils.get_canonical_submitter(submitter)
        self.seed = int(seed)
        self.slot = slot
        self.q = q
        if "dupers" in kwargs:
            self.dupers = kwargs["dupers"]
        else:
            submitters = kwargs.get("submitters")
            if submitters:
                if isinstance(submitters, str):
                    submitters = map(str.strip, submitters.split(";"))
                submitters = set(map(str.lower, submitters)) - {self.submitter_cmp}
            else:
                # Could be blank ("") or not given at all (None)
                submitters = set()
            self.dupers = submitters

    def __str__(self):
        """
        Pretty way of converting the submission to a string.

        Includes the artist, song, submitter, and submitted seed values.
        """

        slot = "" if self.slot is None else f"{self.slot} "
        if self.is_bye:
            return f"{slot}Bye"
        else:
            dupers = f" [{', '.join(sorted(self.dupers))}]" if self.dupers else ""
            return f"{slot}{self.artist} - {self.song} <{self.submitter}, {self.seed}{dupers}>"

    @classmethod
    def Bye(cls, *, slot=None, **kwargs):
        """
        Returns a dummy instance indicating that a slot's opponent gets a bye.
        """

        # Use UUID for artist and submitter as a hack so they won't count
        # against us during analysis
        bye = cls(
            artist=uuid.uuid4().hex,
            song="",
            submitter=uuid.uuid4().hex,
            seed=6,
            slot=slot,
            is_bye=True,
            **kwargs,
        )
        return bye

    @classmethod
    def copy(cls, instance, **overrides):
        kwargs = instance.__dict__.copy()
        kwargs.update(overrides)
        return cls(**kwargs)

    @classmethod
    def get_submissions(cls, data):
        submissions = [cls(**row) for row in data]

        if utils.has_byes(len(data)):
            # Make dummy submissions at the end until we have an even power of two
            submissions += [
                cls.Bye() for i in range(2 ** (math.floor(math.log2(len(data))) - 1))
            ]

        return submissions

    @classmethod
    def get_ordered_submissions(cls, seeds, data):
        # Grossly inefficient, but we don't do it often
        submissions = cls.get_submissions(data)
        return [
            Submission.copy(submissions[j], slot=i, q=int(i // (len(submissions) / 4)))
            for i, j in enumerate(seeds)
        ]
