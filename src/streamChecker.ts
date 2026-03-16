export default class StreamChecker {
    private marker: string;
    private checkIndex: number = 0;
    private isChecking: boolean = false;

    constructor(marker: string) {
        this.marker = marker;
    }

    processLine(line: string): { status: boolean, before: string, after: string, other: string } {
        if (!this.isChecking) {
            let startIndex = line.indexOf(this.marker[0] as string);
            while (startIndex !== -1) {
                let checkMark = line.slice(startIndex, startIndex + this.marker.length);
                if (this.marker.startsWith(checkMark)) {
                    this.isChecking = true;
                    this.checkIndex = checkMark.length;
                    if (this.checkIndex === this.marker.length) {
                        this.isChecking = false;
                        this.checkIndex = 0;
                        return { status: true, before: line.slice(0, startIndex), after: line.slice(startIndex + this.marker.length), other: "" };
                    }
                    return { status: false, before: line.slice(0, startIndex), after: "", other: "" };
                }
                startIndex = line.indexOf(this.marker[0] as string, startIndex + 1);
            }
        } else {
            let checkMark = line.slice(0, this.marker.length - this.checkIndex);
            if (this.marker.startsWith(checkMark, this.checkIndex)) {
                this.checkIndex += checkMark.length;
            }
            else {
                this.isChecking = false;
                const other = this.marker.slice(0, this.checkIndex) + line;
                this.checkIndex = 0;
                return { status: false, before: "", after: "", other: other };
            }
            if (this.checkIndex === this.marker.length) {
                this.isChecking = false;
                this.checkIndex = 0;
                return { status: true, before: "", after: line.slice(checkMark.length), other: "" };
            }
            return { status: false, before: "", after: "", other: "" };
        }
        return { status: false, before: "", after: "", other: line };
    }
}